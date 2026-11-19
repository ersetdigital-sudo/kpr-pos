-- Satuan jual tambahan dan dimensi produk.
-- Aditif & idempoten: produk/transaksi lama tetap memakai satuan dasar.
-- Stok selalu disimpan dalam satuan dasar; konversi dilakukan di server dari
-- tabel product_units, bukan dari angka klien.

-- Helper privat dipanggil RPC service_role.
grant usage on schema private to service_role;

-- ===== Kolom produk =====
alter table public.products
  add column if not exists base_unit text not null default 'pcs';
alter table public.products
  add column if not exists length_m numeric(12,3);
alter table public.products
  add column if not exists weight_kg numeric(12,3);

-- ===== Tabel satuan jual =====
create table if not exists public.product_units (
  id              text primary key,
  product_id      text not null references public.products(id) on delete cascade,
  name            text not null,
  content         integer not null check (content >= 2),
  price           integer not null check (price > 0),
  wholesale_price integer not null default 0 check (wholesale_price >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists product_units_product_idx
  on public.product_units (product_id);
create unique index if not exists product_units_name_unique
  on public.product_units (product_id, lower(trim(name)));

alter table public.product_units enable row level security;

drop policy if exists product_units_read on public.product_units;
create policy product_units_read on public.product_units
  for select to authenticated using (true);

grant select on public.product_units to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.product_units from authenticated;
revoke all on public.product_units from anon;
grant select, insert, update, delete on public.product_units to service_role;

-- ===== Snapshot satuan di item =====
alter table public.transaction_items
  add column if not exists unit_id text references public.product_units(id) on delete set null;
alter table public.transaction_items
  add column if not exists unit_name text;
alter table public.transaction_items
  add column if not exists unit_content integer not null default 1;
alter table public.transaction_items
  add column if not exists base_quantity integer
  generated always as (quantity * unit_content) stored;

alter table public.sales_order_items
  add column if not exists unit_id text references public.product_units(id) on delete set null;
alter table public.sales_order_items
  add column if not exists unit_name text;
alter table public.sales_order_items
  add column if not exists unit_content integer not null default 1;
alter table public.sales_order_items
  add column if not exists base_quantity integer
  generated always as (quantity * unit_content) stored;

alter table public.cart_draft_items
  add column if not exists unit_id text references public.product_units(id) on delete set null;
alter table public.cart_draft_items
  add column if not exists unit_name text;
alter table public.cart_draft_items
  add column if not exists unit_content integer not null default 1;

create index if not exists transaction_items_unit_idx
  on public.transaction_items (unit_id);
create index if not exists sales_order_items_unit_idx
  on public.sales_order_items (unit_id);
create index if not exists cart_draft_items_unit_idx
  on public.cart_draft_items (unit_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transaction_items_unit_content_check'
      and conrelid = 'public.transaction_items'::regclass
  ) then
    alter table public.transaction_items
      add constraint transaction_items_unit_content_check
      check (unit_content >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_order_items_unit_content_check'
      and conrelid = 'public.sales_order_items'::regclass
  ) then
    alter table public.sales_order_items
      add constraint sales_order_items_unit_content_check
      check (unit_content >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cart_draft_items_unit_content_check'
      and conrelid = 'public.cart_draft_items'::regclass
  ) then
    alter table public.cart_draft_items
      add constraint cart_draft_items_unit_content_check
      check (unit_content >= 1);
  end if;
end;
$$;

-- ===== Helper satuan =====
create or replace function private.resolve_selling_unit(
  p_product_id text,
  p_unit_id text
)
returns table (
  id text,
  name text,
  content integer,
  retail_price integer,
  wholesale_price integer
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_product record;
begin
  select base_unit, price, wholesale_price
  into v_product
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'Produk tidak ditemukan';
  end if;

  if nullif(trim(coalesce(p_unit_id, '')), '') is null then
    return query
      select null::text, v_product.base_unit, 1,
        v_product.price, coalesce(v_product.wholesale_price, 0);
    return;
  end if;

  return query
    select u.id, u.name, u.content, u.price, u.wholesale_price
    from public.product_units u
    where u.id = p_unit_id and u.product_id = p_product_id;

  if not found then
    raise exception 'Satuan produk tidak ditemukan';
  end if;
end;
$$;
revoke execute on function private.resolve_selling_unit(text, text)
  from public, anon, authenticated;
grant execute on function private.resolve_selling_unit(text, text)
  to service_role;

create or replace function private.save_product_units(
  p_product_id text,
  p_base_unit text,
  p_units jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_unit record;
  v_name text;
  v_base_unit text := trim(coalesce(p_base_unit, ''));
  v_existing_id text;
  v_seen_ids text[] := '{}';
  v_seen_names text[] := '{}';
begin
  if v_base_unit = '' then
    raise exception 'Satuan dasar wajib diisi';
  end if;
  if length(v_base_unit) > 40 then
    raise exception 'Nama satuan dasar maksimal 40 karakter';
  end if;

  if p_units is not null and jsonb_typeof(p_units) <> 'array' then
    raise exception 'Data satuan jual tidak valid';
  end if;

  for v_unit in
    select * from jsonb_to_recordset(coalesce(p_units, '[]'::jsonb)) as x(
      name text, content integer, price integer, wholesale_price integer
    )
  loop
    v_name := trim(coalesce(v_unit.name, ''));

    if v_name = '' then
      raise exception 'Nama satuan jual wajib diisi';
    end if;
    if length(v_name) > 40 then
      raise exception 'Nama satuan jual maksimal 40 karakter';
    end if;
    if lower(v_name) = lower(v_base_unit) then
      raise exception 'Nama satuan jual tidak boleh sama dengan satuan dasar';
    end if;
    if lower(v_name) = any(v_seen_names) then
      raise exception 'Nama satuan jual % duplikat', v_name;
    end if;
    if v_unit.content is null or v_unit.content < 2 then
      raise exception 'Isi satuan % minimal 2 %', v_name, v_base_unit;
    end if;
    if v_unit.price is null or v_unit.price <= 0 then
      raise exception 'Harga satuan % harus lebih dari 0', v_name;
    end if;
    if coalesce(v_unit.wholesale_price, 0) < 0 then
      raise exception 'Harga grosir satuan % tidak boleh negatif', v_name;
    end if;

    v_seen_names := array_append(v_seen_names, lower(v_name));

    select u.id into v_existing_id
    from public.product_units u
    where u.product_id = p_product_id
      and lower(trim(u.name)) = lower(v_name);

    if v_existing_id is not null then
      update public.product_units set
        name = v_name,
        content = v_unit.content,
        price = v_unit.price,
        wholesale_price = coalesce(v_unit.wholesale_price, 0),
        updated_at = now()
      where id = v_existing_id;
    else
      insert into public.product_units (
        id, product_id, name, content, price, wholesale_price
      ) values (
        public.gen_id('unit'), p_product_id, v_name, v_unit.content,
        v_unit.price, coalesce(v_unit.wholesale_price, 0)
      )
      returning id into v_existing_id;
    end if;

    v_seen_ids := array_append(v_seen_ids, v_existing_id);
  end loop;

  delete from public.product_units
  where product_id = p_product_id
    and id <> all(v_seen_ids);
end;
$$;
revoke execute on function private.save_product_units(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function private.save_product_units(text, text, jsonb)
  to service_role;

-- ===== Produk: satuan & dimensi =====
-- Fungsi baru memakai nama berbeda agar fungsi lama tetap hidup selama deploy.
create or replace function public.fn_create_product_with_units(
  p_name text,
  p_sku text,
  p_category_id text,
  p_cost_price integer,
  p_price integer,
  p_image_url text,
  p_min_stock integer,
  p_wholesale_price integer,
  p_branch_id text,
  p_base_unit text,
  p_length_m numeric,
  p_weight_kg numeric,
  p_units jsonb
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_id text;
  v_name text := trim(p_name);
  v_sku text := upper(trim(p_sku));
  v_wholesale_price integer := greatest(coalesce(p_wholesale_price, 0), 0);
  v_base_unit text := trim(coalesce(p_base_unit, ''));
begin
  if v_base_unit = '' then v_base_unit := 'pcs'; end if;
  if length(v_name) < 1 then raise exception 'Nama produk wajib diisi'; end if;
  if length(v_sku) < 1 then raise exception 'SKU wajib diisi'; end if;
  if p_cost_price < 0 then raise exception 'Harga modal tidak boleh negatif'; end if;
  if p_price <= 0 then raise exception 'Harga jual harus lebih dari 0'; end if;
  if v_wholesale_price < 0 then raise exception 'Harga grosir tidak boleh negatif'; end if;
  if p_min_stock < 0 then raise exception 'Batas stok tidak boleh negatif'; end if;
  if p_length_m is not null and p_length_m <= 0 then
    raise exception 'Panjang harus lebih dari 0';
  end if;
  if p_weight_kg is not null and p_weight_kg <= 0 then
    raise exception 'Berat harus lebih dari 0';
  end if;
  if p_branch_id is null
    or not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'Cabang produk tidak ditemukan';
  end if;
  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'Kategori tidak ditemukan';
  end if;
  if exists (select 1 from public.products where lower(sku) = lower(v_sku)) then
    raise exception 'SKU % sudah dipakai produk lain', v_sku;
  end if;

  v_id := public.gen_id('prod');

  insert into public.products (
    id, name, sku, category_id, cost_price, price, wholesale_price,
    image_url, is_active, base_unit, length_m, weight_kg
  ) values (
    v_id, v_name, v_sku, p_category_id, p_cost_price, p_price,
    v_wholesale_price, nullif(trim(coalesce(p_image_url, '')), ''), true,
    v_base_unit, p_length_m, p_weight_kg
  );

  insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
  values (p_branch_id, v_id, 0, p_min_stock);

  perform private.save_product_units(v_id, v_base_unit, p_units);

  return v_id;
end;
$$;
revoke execute on function public.fn_create_product_with_units(
  text, text, text, integer, integer, text, integer, integer, text,
  text, numeric, numeric, jsonb
) from public, anon, authenticated;
grant execute on function public.fn_create_product_with_units(
  text, text, text, integer, integer, text, integer, integer, text,
  text, numeric, numeric, jsonb
) to service_role;

create or replace function public.fn_update_product_with_units(
  p_id text,
  p_name text,
  p_sku text,
  p_category_id text,
  p_cost_price integer,
  p_price integer,
  p_image_url text,
  p_min_stock integer,
  p_wholesale_price integer,
  p_base_unit text,
  p_length_m numeric,
  p_weight_kg numeric,
  p_units jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_name text := trim(p_name);
  v_sku text := upper(trim(p_sku));
  v_wholesale_price integer := greatest(coalesce(p_wholesale_price, 0), 0);
  v_old_base_unit text;
  v_base_unit text := trim(coalesce(p_base_unit, ''));
begin
  select base_unit into v_old_base_unit
  from public.products
  where id = p_id
  for update;

  if not found then
    raise exception 'Produk tidak ditemukan';
  end if;
  if v_base_unit = '' then v_base_unit := 'pcs'; end if;
  if length(v_name) < 1 then raise exception 'Nama produk wajib diisi'; end if;
  if length(v_sku) < 1 then raise exception 'SKU wajib diisi'; end if;
  if p_cost_price < 0 then raise exception 'Harga modal tidak boleh negatif'; end if;
  if p_price <= 0 then raise exception 'Harga jual harus lebih dari 0'; end if;
  if v_wholesale_price < 0 then raise exception 'Harga grosir tidak boleh negatif'; end if;
  if p_min_stock < 0 then raise exception 'Batas stok tidak boleh negatif'; end if;
  if p_length_m is not null and p_length_m <= 0 then
    raise exception 'Panjang harus lebih dari 0';
  end if;
  if p_weight_kg is not null and p_weight_kg <= 0 then
    raise exception 'Berat harus lebih dari 0';
  end if;
  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'Kategori tidak ditemukan';
  end if;
  if exists (
    select 1 from public.products
    where id <> p_id and lower(sku) = lower(v_sku)
  ) then
    raise exception 'SKU % sudah dipakai produk lain', v_sku;
  end if;

  if v_base_unit <> v_old_base_unit then
    if exists (
      select 1 from public.stock_levels
      where product_id = p_id and quantity <> 0
    )
    or exists (select 1 from public.stock_in_items where product_id = p_id)
    or exists (select 1 from public.stock_opname_items where product_id = p_id)
    or exists (select 1 from public.stock_transfer_items where product_id = p_id)
    or exists (select 1 from public.transaction_items where product_id = p_id)
    or exists (select 1 from public.sales_order_items where product_id = p_id)
    then
      raise exception 'Satuan dasar tidak bisa diubah karena produk sudah punya stok atau riwayat transaksi';
    end if;
  end if;

  update public.products set
    name = v_name,
    sku = v_sku,
    category_id = p_category_id,
    cost_price = p_cost_price,
    price = p_price,
    wholesale_price = v_wholesale_price,
    image_url = nullif(trim(coalesce(p_image_url, '')), ''),
    base_unit = v_base_unit,
    length_m = p_length_m,
    weight_kg = p_weight_kg
  where id = p_id;

  update public.stock_levels
  set min_stock = p_min_stock
  where product_id = p_id;

  perform private.save_product_units(p_id, v_base_unit, p_units);
end;
$$;
revoke execute on function public.fn_update_product_with_units(
  text, text, text, text, integer, integer, text, integer, integer,
  text, numeric, numeric, jsonb
) from public, anon, authenticated;
grant execute on function public.fn_update_product_with_units(
  text, text, text, text, integer, integer, text, integer, integer,
  text, numeric, numeric, jsonb
) to service_role;

-- ===== Import Excel: panjang/berat opsional =====
create or replace function public.fn_import_products(
  p_branch_id text,
  p_user_id text,
  p_rows jsonb
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_row record;
  v_id text;
  v_count integer := 0;
  v_stock_in_id text;
  v_has_stock boolean := false;
begin
  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;
  if not exists (select 1 from public.employees where id = p_user_id) then
    raise exception 'Karyawan tidak ditemukan';
  end if;
  if p_rows is null or jsonb_array_length(p_rows) = 0 then
    raise exception 'Tidak ada baris valid untuk diimpor';
  end if;

  v_stock_in_id := public.gen_id('si');
  insert into public.stock_ins (id, branch_id, date, note, user_id)
  values (v_stock_in_id, p_branch_id, current_date, 'Stok awal dari import Excel', p_user_id);

  for v_row in
    select * from jsonb_to_recordset(p_rows) as x(
      name text, sku text, category_id text, cost_price integer,
      price integer, stock integer, min_stock integer,
      length_m numeric, weight_kg numeric
    )
  loop
    if exists (select 1 from public.products where lower(sku) = lower(trim(v_row.sku))) then
      raise exception 'SKU % duplikat saat impor', v_row.sku;
    end if;
    if not exists (select 1 from public.categories where id = v_row.category_id) then
      raise exception 'Kategori % tidak ditemukan', v_row.category_id;
    end if;
    if v_row.length_m is not null and v_row.length_m <= 0 then
      raise exception 'Panjang % tidak valid', v_row.sku;
    end if;
    if v_row.weight_kg is not null and v_row.weight_kg <= 0 then
      raise exception 'Berat % tidak valid', v_row.sku;
    end if;

    v_id := public.gen_id('prod');

    insert into public.products (
      id, name, sku, category_id, cost_price, price, is_active,
      length_m, weight_kg
    ) values (
      v_id, trim(v_row.name), upper(trim(v_row.sku)), v_row.category_id,
      coalesce(v_row.cost_price, 0), coalesce(v_row.price, 0), true,
      v_row.length_m, v_row.weight_kg
    );

    insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
    values (
      p_branch_id, v_id, coalesce(v_row.stock, 0),
      coalesce(v_row.min_stock, 5)
    );

    if coalesce(v_row.stock, 0) > 0 then
      insert into public.stock_in_items (id, stock_in_id, product_id, product_name, quantity)
      values (
        public.gen_id('sii'), v_stock_in_id, v_id,
        trim(v_row.name), v_row.stock
      );
      v_has_stock := true;
    end if;

    v_count := v_count + 1;
  end loop;

  if not v_has_stock then
    delete from public.stock_ins where id = v_stock_in_id;
  end if;

  return v_count;
end;
$$;
revoke execute on function public.fn_import_products(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_import_products(text, text, jsonb)
  to service_role;

-- ===== Stok masuk =====
create or replace function public.fn_add_stock_in(
  p_branch_id text,
  p_date date,
  p_note text,
  p_user_id text,
  p_items jsonb
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_id text := public.gen_id('si');
  v_item record;
  v_product_name text;
  v_unit record;
  v_base_quantity integer;
begin
  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;
  if p_date is null then raise exception 'Tanggal stok masuk wajib diisi'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Isi jumlah stok masuk';
  end if;
  if not exists (select 1 from public.employees where id = p_user_id) then
    raise exception 'Karyawan tidak ditemukan';
  end if;

  insert into public.stock_ins (id, branch_id, date, note, user_id)
  values (v_id, p_branch_id, p_date, trim(coalesce(p_note, '')), p_user_id);

  for v_item in
    select * from jsonb_to_recordset(p_items) as x(
      product_id text, quantity integer, unit_id text
    )
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah stok harus lebih dari 0';
    end if;

    select name into v_product_name
    from public.products where id = v_item.product_id;

    if v_product_name is null then
      raise exception 'Produk tidak ditemukan';
    end if;

    select * into v_unit
    from private.resolve_selling_unit(v_item.product_id, v_item.unit_id);

    v_base_quantity := v_item.quantity * v_unit.content;

    insert into public.stock_in_items (id, stock_in_id, product_id, product_name, quantity)
    values (public.gen_id('sii'), v_id, v_item.product_id, v_product_name, v_base_quantity);

    insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
    values (p_branch_id, v_item.product_id, v_base_quantity, 5)
    on conflict (branch_id, product_id) do update
      set quantity = public.stock_levels.quantity + excluded.quantity;
  end loop;

  return v_id;
end;
$$;
revoke execute on function public.fn_add_stock_in(text, date, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_add_stock_in(text, date, text, text, jsonb)
  to service_role;

-- ===== Stok opname =====
create or replace function public.fn_submit_opname(
  p_branch_id text,
  p_date date,
  p_note text,
  p_user_id text,
  p_physical jsonb
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_id text := public.gen_id('op');
  v_product record;
  v_entry jsonb;
  v_quantity integer;
  v_unit_id text;
  v_unit record;
  v_physical integer;
  v_system integer;
  v_difference integer;
  v_count integer := 0;
begin
  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;
  if p_date is null then raise exception 'Tanggal opname wajib diisi'; end if;
  if not exists (select 1 from public.employees where id = p_user_id) then
    raise exception 'Karyawan tidak ditemukan';
  end if;

  insert into public.stock_opnames (id, branch_id, date, note, user_id)
  values (v_id, p_branch_id, p_date, trim(coalesce(p_note, '')), p_user_id);

  for v_product in
    select id, name from public.products where is_active = true order by name
  loop
    select quantity into v_system
    from public.stock_levels
    where branch_id = p_branch_id and product_id = v_product.id;

    v_system := coalesce(v_system, 0);
    v_entry := p_physical -> v_product.id;
    v_physical := v_system;

    if v_entry is not null and jsonb_typeof(v_entry) = 'object' then
      v_quantity := nullif(v_entry ->> 'quantity', '')::integer;
      v_unit_id := nullif(trim(coalesce(v_entry ->> 'unitId', '')), '');

      if v_quantity is not null then
        select * into v_unit
        from private.resolve_selling_unit(v_product.id, v_unit_id);
        v_physical := v_quantity * v_unit.content;
      end if;
    elsif v_entry is not null and jsonb_typeof(v_entry) = 'number' then
      v_physical := (v_entry #>> '{}')::integer;
    end if;

    if v_physical < 0 then
      raise exception 'Stok fisik tidak boleh negatif';
    end if;

    v_difference := v_physical - v_system;

    if v_difference = 0 then
      continue;
    end if;

    insert into public.stock_opname_items (
      id, opname_id, product_id, product_name,
      system_quantity, physical_quantity, difference
    ) values (
      public.gen_id('opi'), v_id, v_product.id, v_product.name,
      v_system, v_physical, v_difference
    );

    insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
    values (p_branch_id, v_product.id, v_physical, 5)
    on conflict (branch_id, product_id) do update
      set quantity = excluded.quantity;

    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'Tidak ada selisih stok untuk dicatat';
  end if;

  return v_id;
end;
$$;
revoke execute on function public.fn_submit_opname(text, date, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_submit_opname(text, date, text, text, jsonb)
  to service_role;

-- ===== Transfer stok =====
create or replace function public.fn_transfer_stock(
  p_from_branch_id text,
  p_to_branch_id text,
  p_date date,
  p_note text,
  p_user_id text,
  p_items jsonb
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_id text := public.gen_id('tr');
  v_item record;
  v_product_name text;
  v_unit record;
  v_base_quantity integer;
  v_stock integer;
begin
  if p_from_branch_id = p_to_branch_id then
    raise exception 'Cabang tujuan harus berbeda';
  end if;
  if not exists (select 1 from public.branches where id = p_from_branch_id) then
    raise exception 'Cabang asal tidak ditemukan';
  end if;
  if not exists (select 1 from public.branches where id = p_to_branch_id) then
    raise exception 'Cabang tujuan tidak ditemukan';
  end if;
  if p_date is null then raise exception 'Tanggal transfer wajib diisi'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Isi minimal satu produk';
  end if;
  if not exists (select 1 from public.employees where id = p_user_id) then
    raise exception 'Karyawan tidak ditemukan';
  end if;

  insert into public.stock_transfers (
    id, from_branch_id, to_branch_id, date, note, user_id
  ) values (
    v_id, p_from_branch_id, p_to_branch_id, p_date,
    trim(coalesce(p_note, '')), p_user_id
  );

  for v_item in
    select * from jsonb_to_recordset(p_items) as x(
      product_id text, quantity integer, unit_id text
    )
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah stok harus lebih dari 0';
    end if;

    select name into v_product_name
    from public.products where id = v_item.product_id;

    if v_product_name is null then
      raise exception 'Produk tidak ditemukan';
    end if;

    select * into v_unit
    from private.resolve_selling_unit(v_item.product_id, v_item.unit_id);

    v_base_quantity := v_item.quantity * v_unit.content;

    select quantity into v_stock
    from public.stock_levels
    where branch_id = p_from_branch_id and product_id = v_item.product_id
    for update;

    if coalesce(v_stock, 0) < v_base_quantity then
      raise exception 'Stok % tersisa % unit dasar', v_product_name, coalesce(v_stock, 0);
    end if;

    insert into public.stock_transfer_items (
      id, transfer_id, product_id, product_name, quantity
    ) values (
      public.gen_id('tri'), v_id, v_item.product_id, v_product_name, v_base_quantity
    );

    update public.stock_levels
    set quantity = quantity - v_base_quantity
    where branch_id = p_from_branch_id and product_id = v_item.product_id;

    insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
    values (p_to_branch_id, v_item.product_id, v_base_quantity, 5)
    on conflict (branch_id, product_id) do update
      set quantity = public.stock_levels.quantity + excluded.quantity;
  end loop;

  return v_id;
end;
$$;
revoke execute on function public.fn_transfer_stock(text, text, date, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_transfer_stock(text, text, date, text, text, jsonb)
  to service_role;

-- ===== JSON penjualan: snapshot satuan =====
create or replace function public.fn_sales_transaction_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id,
    'invoiceNumber', t.invoice_number,
    'branchId', t.branch_id,
    'cashierId', t.cashier_id,
    'salesEmployeeId', t.sales_employee_id,
    'subtotal', t.subtotal,
    'discount', jsonb_build_object(
      'type', t.discount_type,
      'value', t.discount_value,
      'amount', t.discount_amount
    ),
    'total', t.total,
    'taxEnabled', t.tax_enabled,
    'taxRate', t.tax_rate,
    'taxAmount', t.tax_amount,
    'shippingMethod', t.shipping_method,
    'shippingCost', t.shipping_cost,
    'payment', jsonb_build_object(
      'method', t.payment_method,
      'cashReceived', t.cash_received,
      'change', t.change_amount,
      'bankAccountId', t.bank_account_id
    ),
    'createdAt', to_char(t.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', i.product_id,
        'productName', i.product_name,
        'unitId', i.unit_id,
        'unitName', i.unit_name,
        'unitContent', coalesce(i.unit_content, 1),
        'baseQuantity', coalesce(i.base_quantity, i.quantity),
        'unitPrice', i.unit_price,
        'unitCost', i.unit_cost,
        'quantity', i.quantity,
        'lineTotal', i.line_total,
        'priceType', i.price_type,
        'discountType', i.discount_type,
        'discountValue', i.discount_value,
        'discountAmount', i.discount_amount
      ) order by i.id)
      from public.transaction_items i
      where i.transaction_id = t.id
    ), '[]'::jsonb),
    'refund', case
      when t.refunded_at is null then null
      else jsonb_build_object(
        'at', to_char(t.refunded_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'byId', coalesce(t.refunded_by_id, ''),
        'byName', coalesce(t.refunded_by_name, ''),
        'reason', coalesce(t.refund_reason, ''),
        'amount', coalesce(t.refund_amount, 0)
      )
    end
  )
  from public.transactions t
  where t.id = p_id;
$$;
revoke execute on function public.fn_sales_transaction_json(text)
  from public, anon, authenticated;
grant execute on function public.fn_sales_transaction_json(text)
  to service_role;

create or replace function public.fn_sales_order_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'orderNumber', o.order_number,
    'customerName', o.customer_name,
    'customerPhone', o.customer_phone,
    'customerId', o.customer_id,
    'branchId', o.branch_id,
    'salesEmployeeId', o.sales_employee_id,
    'total', o.total,
    'taxEnabled', o.tax_enabled,
    'taxRate', o.tax_rate,
    'taxAmount', o.tax_amount,
    'shippingMethod', o.shipping_method,
    'shippingCost', o.shipping_cost,
    'status', o.status,
    'paymentScheme', o.payment_scheme,
    'tempoDays', o.tempo_days,
    'dueDate', case when o.due_date is null then null else to_char(o.due_date, 'YYYY-MM-DD') end,
    'processedAt', case
      when o.processed_at is null then null
      else to_char(o.processed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    end,
    'paidAt', case
      when o.paid_at is null then null
      else to_char(o.paid_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    end,
    'settledByName', o.settled_by_name,
    'stockApplied', o.stock_applied,
    'transactionId', o.transaction_id,
    'note', o.note,
    'createdAt', to_char(o.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', i.product_id,
        'productName', i.product_name,
        'unitId', i.unit_id,
        'unitName', i.unit_name,
        'unitContent', coalesce(i.unit_content, 1),
        'baseQuantity', coalesce(i.base_quantity, i.quantity),
        'unitPrice', i.unit_price,
        'unitCost', i.unit_cost,
        'quantity', i.quantity,
        'priceType', i.price_type,
        'discountType', i.discount_type,
        'discountValue', i.discount_value,
        'discountAmount', i.discount_amount
      ) order by i.id)
      from public.sales_order_items i
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.sales_orders o
  where o.id = p_id;
$$;
revoke execute on function public.fn_sales_order_json(text)
  from public, anon, authenticated;
grant execute on function public.fn_sales_order_json(text)
  to service_role;

create or replace function public.fn_cart_draft_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id,
    'label', d.label,
    'branchId', d.branch_id,
    'cashierId', d.cashier_id,
    'salesEmployeeId', d.sales_employee_id,
    'discountType', d.discount_type,
    'discountValue', d.discount_value,
    'createdAt', to_char(d.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(d.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', i.product_id,
        'unitId', i.unit_id,
        'unitName', i.unit_name,
        'unitContent', coalesce(i.unit_content, 1),
        'quantity', i.quantity
      ) order by i.id)
      from public.cart_draft_items i
      where i.draft_id = d.id
    ), '[]'::jsonb)
  )
  from public.cart_drafts d
  where d.id = p_id;
$$;
revoke execute on function public.fn_cart_draft_json(text)
  from public, anon, authenticated;
grant execute on function public.fn_cart_draft_json(text)
  to service_role;

-- ===== Buat pesanan sales: satuan jual =====
create or replace function public.fn_create_sales_order(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_branch_id text := p_payload ->> 'branchId';
  v_sales_id text := p_payload ->> 'salesEmployeeId';
  v_order_id text := public.gen_id('so');
  v_order_number text;
  v_customer_name text := trim(coalesce(p_payload ->> 'customerName', ''));
  v_customer_phone text := trim(coalesce(p_payload ->> 'customerPhone', ''));
  v_note text := trim(coalesce(p_payload ->> 'note', ''));
  v_goods_total integer := 0;
  v_tax_enabled boolean := coalesce((p_payload ->> 'taxEnabled')::boolean, false);
  v_tax_rate numeric(5,2) := greatest(
    0,
    least(100, coalesce((p_payload ->> 'taxRate')::numeric, 0))
  );
  v_tax_amount integer := 0;
  v_shipping_method text := coalesce(p_payload ->> 'shippingMethod', '');
  v_shipping_cost integer := 0;
  v_total integer := 0;
  v_item record;
  v_product record;
  v_unit record;
  v_price_type text;
  v_discount_type text;
  v_discount_value integer;
  v_unit_price integer;
  v_unit_cost integer;
  v_gross integer;
  v_item_discount integer;
begin
  if length(v_customer_name) = 0 then raise exception 'Nama pelanggan wajib diisi'; end if;

  if v_branch_id is null or not exists (select 1 from public.branches where id = v_branch_id) then
    raise exception 'Cabang pesanan tidak ditemukan';
  end if;

  if v_sales_id is null or not exists (
    select 1 from public.employees
    where id = v_sales_id and role = 'Sales' and is_active = true
  ) then
    raise exception 'Pilih sales yang valid';
  end if;

  if jsonb_array_length(coalesce(p_payload -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'Tambahkan minimal satu produk';
  end if;

  if v_shipping_method not in ('pickup', 'paid', 'free') then
    raise exception 'Pilih metode pengiriman';
  end if;

  v_shipping_cost := case
    when v_shipping_method = 'paid'
      then greatest(coalesce((p_payload ->> 'shippingCost')::integer, 0), 0)
    else 0
  end;

  v_order_number := public.fn_next_sales_order_number();

  insert into public.sales_orders (
    id, order_number, customer_name, customer_phone, branch_id,
    sales_employee_id, total, status, stock_applied, note, created_at,
    tax_enabled, tax_rate, tax_amount, shipping_method, shipping_cost
  ) values (
    v_order_id, v_order_number, v_customer_name, v_customer_phone, v_branch_id,
    v_sales_id, 0, 'Menunggu bayar', false, v_note, now(),
    v_tax_enabled, v_tax_rate, 0, v_shipping_method, v_shipping_cost
  );

  for v_item in
    select
      item.value ->> 'productId' as product_id,
      coalesce(nullif(trim(item.value ->> 'unitId'), ''), '') as unit_id,
      sum(coalesce((item.value ->> 'quantity')::integer, 0))::integer as quantity,
      coalesce(nullif(item.value ->> 'priceType', ''), 'retail') as price_type,
      coalesce(nullif(item.value ->> 'discountType', ''), 'nominal') as discount_type,
      greatest(coalesce((item.value ->> 'discountValue')::integer, 0), 0) as discount_value
    from jsonb_array_elements(coalesce(p_payload -> 'items', '[]'::jsonb)) as item(value)
    group by 1, 2, 4, 5, 6
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah produk tidak valid';
    end if;

    v_price_type := v_item.price_type;
    v_discount_type := v_item.discount_type;
    v_discount_value := v_item.discount_value;

    if v_price_type not in ('retail', 'wholesale') then
      raise exception 'Jenis harga tidak valid';
    end if;
    if v_discount_type not in ('nominal', 'percent') then
      raise exception 'Tipe diskon tidak valid';
    end if;

    select name, price, wholesale_price, cost_price, base_unit
    into v_product
    from public.products where id = v_item.product_id and is_active = true;

    if not found then raise exception 'Ada produk yang tidak tersedia'; end if;

    select * into v_unit
    from private.resolve_selling_unit(v_item.product_id, v_item.unit_id);

    v_unit_price := case
      when v_price_type = 'wholesale' and v_unit.wholesale_price > 0
        then v_unit.wholesale_price
      else v_unit.retail_price
    end;
    v_unit_cost := v_product.cost_price * v_unit.content;

    v_gross := v_unit_price * v_item.quantity;
    v_item_discount := case
      when v_discount_type = 'percent' then least(
        v_gross,
        round(v_gross * least(100, v_discount_value) / 100.0)::integer
      )
      else least(v_gross, v_discount_value * v_item.quantity)
    end;

    insert into public.sales_order_items (
      id, order_id, product_id, product_name,
      unit_id, unit_name, unit_content,
      unit_price, unit_cost, quantity,
      price_type, discount_type, discount_value, discount_amount
    ) values (
      public.gen_id('soi'), v_order_id, v_item.product_id, v_product.name,
      nullif(v_item.unit_id, ''), v_unit.name, v_unit.content,
      v_unit_price, v_unit_cost, v_item.quantity,
      v_price_type, v_discount_type, v_discount_value, v_item_discount
    );

    v_goods_total := v_goods_total + (v_gross - v_item_discount);
  end loop;

  if v_goods_total <= 0 then raise exception 'Jumlah produk harus lebih dari 0'; end if;

  -- Ongkir tidak dikenai PPN; dasar PPN hanya barang setelah diskon.
  v_tax_amount := case
    when v_tax_enabled then round(v_goods_total * v_tax_rate / 100.0)::integer
    else 0
  end;
  v_total := v_goods_total + v_tax_amount + v_shipping_cost;

  update public.sales_orders set
    total = v_total,
    tax_amount = v_tax_amount,
    shipping_cost = v_shipping_cost
  where id = v_order_id;

  return public.fn_sales_order_json(v_order_id);
end;
$$;
revoke execute on function public.fn_create_sales_order(jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_create_sales_order(jsonb)
  to service_role;

-- ===== Transaksi kasir: satuan jual =====
create or replace function public.fn_create_transaction(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_branch_id text := p_payload ->> 'branchId';
  v_cashier_id text := p_payload ->> 'cashierId';
  v_sales_id text := nullif(p_payload ->> 'salesEmployeeId', '');
  v_sales_order_id text := nullif(p_payload ->> 'salesOrderId', '');
  v_transaction_id text := public.gen_id('trx');
  v_invoice_number text;
  v_method text := p_payload ->> 'paymentMethod';
  v_cash_received integer := nullif(p_payload ->> 'cashReceived', '')::integer;
  v_bank_account_id text := nullif(p_payload ->> 'bankAccountId', '');
  v_change integer;
  v_subtotal integer := 0;
  v_discount_amount integer := 0;
  v_goods_total integer := 0;
  v_tax_enabled boolean := coalesce((p_payload ->> 'taxEnabled')::boolean, false);
  v_tax_rate numeric(5,2) := greatest(
    0,
    least(100, coalesce((p_payload ->> 'taxRate')::numeric, 0))
  );
  v_tax_amount integer := 0;
  v_shipping_method text := coalesce(p_payload ->> 'shippingMethod', '');
  v_shipping_cost integer := 0;
  v_total integer := 0;
  v_item record;
  v_product record;
  v_unit record;
  v_order public.sales_orders%rowtype;
  v_order_item record;
  v_order_item_found boolean;
  v_price_type text;
  v_discount_type text;
  v_discount_value integer;
  v_unit_price integer;
  v_unit_cost integer;
  v_unit_id text;
  v_unit_name text;
  v_unit_content integer;
  v_base_quantity integer;
  v_gross integer;
  v_item_discount integer;
  v_stock integer;
  v_enabled_methods text[];
begin
  if v_branch_id is null or not exists (select 1 from public.branches where id = v_branch_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;

  if v_cashier_id is null or not exists (
    select 1 from public.employees where id = v_cashier_id and is_active = true
  ) then
    raise exception 'Kasir tidak ditemukan';
  end if;

  if v_sales_id is not null and not exists (
    select 1 from public.employees
    where id = v_sales_id and role = 'Sales' and is_active = true
  ) then
    raise exception 'Sales tidak ditemukan';
  end if;

  if v_method not in ('Cash', 'QRIS', 'Transfer') then
    raise exception 'Metode pembayaran tidak valid';
  end if;

  select enabled_payment_methods into v_enabled_methods
  from public.settings where id = 1;

  if not found then raise exception 'Pengaturan pembayaran belum siap'; end if;
  if not v_method = any(v_enabled_methods) then
    raise exception 'Metode pembayaran sedang tidak aktif';
  end if;

  if jsonb_array_length(coalesce(p_payload -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'Keranjang masih kosong';
  end if;

  if v_shipping_method not in ('pickup', 'paid', 'free') then
    raise exception 'Pilih metode pengiriman';
  end if;

  v_shipping_cost := case
    when v_shipping_method = 'paid'
      then greatest(coalesce((p_payload ->> 'shippingCost')::integer, 0), 0)
    else 0
  end;

  if v_sales_order_id is not null then
    select * into v_order from public.sales_orders
    where id = v_sales_order_id for update;

    if not found then raise exception 'Pesanan tidak ditemukan'; end if;
    if v_order.branch_id <> v_branch_id then
      raise exception 'Cabang pesanan tidak sesuai';
    end if;
    if v_order.status in ('Lunas', 'Dibatalkan') then
      raise exception 'Pesanan sudah tidak bisa dibayar';
    end if;

    v_sales_id := coalesce(v_sales_id, v_order.sales_employee_id);
  end if;

  v_invoice_number := public.fn_next_invoice_number();

  insert into public.transactions (
    id, invoice_number, branch_id, cashier_id, sales_employee_id,
    subtotal, discount_type, discount_value, discount_amount, total,
    payment_method, cash_received, change_amount, bank_account_id, created_at,
    tax_enabled, tax_rate, tax_amount, shipping_method, shipping_cost
  ) values (
    v_transaction_id, v_invoice_number, v_branch_id, v_cashier_id,
    v_sales_id,
    0, 'nominal', 0, 0, 0,
    v_method, null, null, null, now(),
    v_tax_enabled, v_tax_rate, 0, v_shipping_method, v_shipping_cost
  );

  for v_item in
    select
      item.value ->> 'productId' as product_id,
      coalesce(nullif(trim(item.value ->> 'unitId'), ''), '') as unit_id,
      sum(coalesce((item.value ->> 'quantity')::integer, 0))::integer as quantity,
      coalesce(nullif(item.value ->> 'priceType', ''), 'retail') as price_type,
      coalesce(nullif(item.value ->> 'discountType', ''), 'nominal') as discount_type,
      greatest(coalesce((item.value ->> 'discountValue')::integer, 0), 0) as discount_value
    from jsonb_array_elements(coalesce(p_payload -> 'items', '[]'::jsonb)) as item(value)
    group by 1, 2, 4, 5, 6
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah produk tidak valid';
    end if;

    v_price_type := v_item.price_type;
    v_discount_type := v_item.discount_type;
    v_discount_value := v_item.discount_value;

    if v_price_type not in ('retail', 'wholesale') then
      raise exception 'Jenis harga tidak valid';
    end if;
    if v_discount_type not in ('nominal', 'percent') then
      raise exception 'Tipe diskon tidak valid';
    end if;

    select name, price, wholesale_price, cost_price, is_active, base_unit
    into v_product
    from public.products where id = v_item.product_id;

    if not found or v_product.is_active is not true then
      raise exception 'Ada produk yang sudah tidak tersedia';
    end if;

    v_order_item_found := false;

    if v_sales_order_id is not null then
      select unit_price, price_type, discount_type, discount_value,
             unit_id, unit_name, unit_content
      into v_order_item
      from public.sales_order_items
      where order_id = v_sales_order_id
        and product_id = v_item.product_id
        and coalesce(unit_id, '') = coalesce(v_item.unit_id, '')
      limit 1;

      v_order_item_found := found;

      -- Klien lama mengirim tanpa unit_id; cocokkan ke baris pertama produk.
      if not v_order_item_found and coalesce(v_item.unit_id, '') = '' then
        select unit_price, price_type, discount_type, discount_value,
               unit_id, unit_name, unit_content
        into v_order_item
        from public.sales_order_items
        where order_id = v_sales_order_id
          and product_id = v_item.product_id
        order by id
        limit 1;

        v_order_item_found := found;
      end if;
    end if;

    if v_order_item_found then
      v_unit_price := v_order_item.unit_price;
      v_price_type := v_order_item.price_type;
      v_discount_type := v_order_item.discount_type;
      v_discount_value := v_order_item.discount_value;
      v_unit_id := v_order_item.unit_id;
      v_unit_name := coalesce(v_order_item.unit_name, v_product.base_unit);
      v_unit_content := coalesce(v_order_item.unit_content, 1);
      v_unit_cost := v_product.cost_price * v_unit_content;
    else
      select * into v_unit
      from private.resolve_selling_unit(v_item.product_id, v_item.unit_id);

      v_unit_id := nullif(v_item.unit_id, '');
      v_unit_name := v_unit.name;
      v_unit_content := v_unit.content;
      v_unit_price := case
        when v_price_type = 'wholesale' and v_unit.wholesale_price > 0
          then v_unit.wholesale_price
        else v_unit.retail_price
      end;
      v_unit_cost := v_product.cost_price * v_unit_content;
    end if;

    v_base_quantity := v_item.quantity * v_unit_content;

    select quantity into v_stock
    from public.stock_levels
    where branch_id = v_branch_id and product_id = v_item.product_id
    for update;

    v_stock := coalesce(v_stock, 0);

    if v_stock < v_base_quantity then
      raise exception 'Stok % tersisa % unit dasar', v_product.name, v_stock;
    end if;

    v_gross := v_unit_price * v_item.quantity;
    v_item_discount := case
      when v_discount_type = 'percent' then least(
        v_gross,
        round(v_gross * least(100, v_discount_value) / 100.0)::integer
      )
      else least(v_gross, v_discount_value * v_item.quantity)
    end;

    insert into public.transaction_items (
      id, transaction_id, product_id, product_name,
      unit_id, unit_name, unit_content,
      unit_price, unit_cost, quantity, line_total,
      price_type, discount_type, discount_value, discount_amount
    ) values (
      public.gen_id('tri'), v_transaction_id, v_item.product_id, v_product.name,
      v_unit_id, v_unit_name, v_unit_content,
      v_unit_price, v_unit_cost, v_item.quantity,
      v_gross - v_item_discount,
      v_price_type, v_discount_type, v_discount_value, v_item_discount
    );

    update public.stock_levels
    set quantity = quantity - v_base_quantity
    where branch_id = v_branch_id and product_id = v_item.product_id;

    v_subtotal := v_subtotal + v_gross;
    v_discount_amount := v_discount_amount + v_item_discount;
  end loop;

  if v_subtotal <= 0 then raise exception 'Keranjang masih kosong'; end if;

  v_goods_total := greatest(0, v_subtotal - v_discount_amount);

  -- Ongkir tidak dikenai PPN; dasar PPN hanya barang setelah diskon.
  v_tax_amount := case
    when v_tax_enabled then round(v_goods_total * v_tax_rate / 100.0)::integer
    else 0
  end;
  v_total := v_goods_total + v_tax_amount + v_shipping_cost;

  if v_method = 'Cash' then
    if v_cash_received is null or v_cash_received < v_total then
      raise exception 'Uang diterima kurang dari total';
    end if;
    v_change := v_cash_received - v_total;
  elsif v_method = 'Transfer' then
    if v_bank_account_id is null or not exists (
      select 1 from public.bank_accounts where id = v_bank_account_id
    ) then
      raise exception 'Rekening transfer belum dipilih';
    end if;
    v_cash_received := null;
    v_change := null;
  else
    v_cash_received := null;
    v_change := null;
    v_bank_account_id := null;
  end if;

  update public.transactions set
    subtotal = v_subtotal,
    discount_type = 'nominal',
    discount_value = v_discount_amount,
    discount_amount = v_discount_amount,
    tax_amount = v_tax_amount,
    shipping_cost = v_shipping_cost,
    total = v_total,
    cash_received = v_cash_received,
    change_amount = v_change,
    bank_account_id = v_bank_account_id
  where id = v_transaction_id;

  if v_sales_order_id is not null then
    update public.sales_orders set
      status = 'Lunas',
      stock_applied = true,
      paid_at = now(),
      transaction_id = v_transaction_id,
      tax_enabled = v_tax_enabled,
      tax_rate = v_tax_rate,
      tax_amount = v_tax_amount,
      shipping_method = v_shipping_method,
      shipping_cost = v_shipping_cost,
      total = v_total
    where id = v_sales_order_id;
  end if;

  return public.fn_sales_transaction_json(v_transaction_id);
end;
$$;
revoke execute on function public.fn_create_transaction(jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_create_transaction(jsonb)
  to service_role;

-- ===== Draft keranjang: satuan jual =====
create or replace function public.fn_save_cart_draft(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_branch_id text := p_payload ->> 'branchId';
  v_cashier_id text := p_payload ->> 'cashierId';
  v_sales_id text := nullif(p_payload ->> 'salesEmployeeId', '');
  v_draft_id text := public.gen_id('draft');
  v_item record;
  v_product record;
  v_unit record;
  v_stock integer;
  v_base_quantity integer;
begin
  if v_branch_id is null or not exists (select 1 from public.branches where id = v_branch_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;

  if v_cashier_id is null or not exists (
    select 1 from public.employees where id = v_cashier_id and is_active = true
  ) then
    raise exception 'Kasir tidak ditemukan';
  end if;

  if jsonb_array_length(coalesce(p_payload -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'Keranjang masih kosong';
  end if;

  insert into public.cart_drafts (
    id, label, branch_id, cashier_id, sales_employee_id,
    discount_type, discount_value, created_at, updated_at
  ) values (
    v_draft_id,
    coalesce(nullif(trim(p_payload ->> 'label'), ''), 'Draft'),
    v_branch_id, v_cashier_id, v_sales_id,
    coalesce(p_payload ->> 'discountType', 'nominal'),
    greatest(coalesce((p_payload ->> 'discountValue')::integer, 0), 0),
    now(), now()
  );

  for v_item in
    select
      item.value ->> 'productId' as product_id,
      coalesce(nullif(trim(item.value ->> 'unitId'), ''), '') as unit_id,
      sum(coalesce((item.value ->> 'quantity')::integer, 0))::integer as quantity
    from jsonb_array_elements(coalesce(p_payload -> 'items', '[]'::jsonb)) as item(value)
    group by 1, 2
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah produk tidak valid';
    end if;

    select name into v_product from public.products
    where id = v_item.product_id and is_active = true;
    if not found then raise exception 'Ada produk yang sudah tidak tersedia'; end if;

    select * into v_unit
    from private.resolve_selling_unit(v_item.product_id, v_item.unit_id);

    v_base_quantity := v_item.quantity * v_unit.content;

    select quantity into v_stock from public.stock_levels
    where branch_id = v_branch_id and product_id = v_item.product_id;
    if coalesce(v_stock, 0) < v_base_quantity then
      raise exception 'Stok % tersisa % unit dasar', v_product.name, coalesce(v_stock, 0);
    end if;

    insert into public.cart_draft_items (
      id, draft_id, product_id, quantity,
      unit_id, unit_name, unit_content
    ) values (
      public.gen_id('drafti'), v_draft_id, v_item.product_id, v_item.quantity,
      nullif(v_item.unit_id, ''), v_unit.name, v_unit.content
    );
  end loop;

  return public.fn_cart_draft_json(v_draft_id);
end;
$$;
revoke execute on function public.fn_save_cart_draft(jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_save_cart_draft(jsonb)
  to service_role;

-- ===== Stok mengikuti qty satuan dasar =====
create or replace function public.fn_refund_transaction_core(
  p_transaction_id text,
  p_user_id text,
  p_reason text,
  p_restore_stock boolean
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_transaction public.transactions%rowtype;
  v_employee public.employees%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_item record;
  v_order_already_returned boolean := false;
begin
  select * into v_employee from public.employees
  where id = p_user_id and is_active = true;

  if not found then raise exception 'Sesi pengguna tidak ditemukan'; end if;
  if length(v_reason) < 3 then raise exception 'Alasan refund minimal 3 karakter'; end if;

  select * into v_transaction from public.transactions
  where id = p_transaction_id for update;

  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if v_transaction.refunded_at is not null then
    raise exception 'Transaksi ini sudah direfund';
  end if;

  select exists (
    select 1 from public.sales_orders
    where transaction_id = p_transaction_id
      and status = 'Dibatalkan'
      and stock_applied = false
  ) into v_order_already_returned;

  if p_restore_stock and not v_order_already_returned then
    for v_item in
      select product_id, coalesce(base_quantity, quantity) as quantity
      from public.transaction_items
      where transaction_id = p_transaction_id and product_id is not null
    loop
      insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
      values (v_transaction.branch_id, v_item.product_id, v_item.quantity, 5)
      on conflict (branch_id, product_id) do update
        set quantity = public.stock_levels.quantity + excluded.quantity;
    end loop;
  end if;

  update public.transactions set
    refunded_at = now(),
    refunded_by_id = v_employee.id,
    refunded_by_name = v_employee.name,
    refund_reason = v_reason,
    refund_amount = v_transaction.total
  where id = p_transaction_id;

  return public.fn_sales_transaction_json(p_transaction_id);
end;
$$;
revoke execute on function public.fn_refund_transaction_core(text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.fn_refund_transaction_core(text, text, text, boolean)
  to service_role;

create or replace function public.fn_update_sales_order_status(
  p_order_id text,
  p_status text,
  p_user_id text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_order public.sales_orders%rowtype;
  v_employee public.employees%rowtype;
  v_item record;
  v_stock integer;
  v_paid_at timestamptz;
  v_stock_applied boolean;
  v_transaction_refunded boolean := false;
begin
  select * into v_employee from public.employees
  where id = p_user_id and is_active = true;

  if not found then raise exception 'Sesi pengguna tidak ditemukan'; end if;

  select * into v_order from public.sales_orders
  where id = p_order_id for update;

  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if v_order.status = p_status then return public.fn_sales_order_json(p_order_id); end if;

  if not (
    (v_order.status = 'Belum sinkron' and p_status in ('Menunggu bayar', 'Dibatalkan'))
    or (v_order.status = 'Menunggu bayar' and p_status in ('Lunas', 'Dibatalkan'))
    or (v_order.status = 'Lunas' and p_status = 'Dibatalkan')
  ) then
    raise exception 'Status % tidak bisa diubah menjadi %', v_order.status, p_status;
  end if;

  if v_order.transaction_id is not null then
    select (refunded_at is not null) into v_transaction_refunded
    from public.transactions
    where id = v_order.transaction_id;

    v_transaction_refunded := coalesce(v_transaction_refunded, false);
  end if;

  v_paid_at := v_order.paid_at;
  v_stock_applied := v_order.stock_applied;

  if p_status = 'Lunas' and v_order.stock_applied = false then
    for v_item in
      select product_id, product_name, coalesce(base_quantity, quantity) as quantity
      from public.sales_order_items
      where order_id = p_order_id and product_id is not null
    loop
      select quantity into v_stock
      from public.stock_levels
      where branch_id = v_order.branch_id and product_id = v_item.product_id
      for update;

      v_stock := coalesce(v_stock, 0);

      if v_stock < v_item.quantity then
        raise exception 'Stok % tersisa % unit dasar', v_item.product_name, v_stock;
      end if;

      update public.stock_levels
      set quantity = quantity - v_item.quantity
      where branch_id = v_order.branch_id and product_id = v_item.product_id;
    end loop;

    v_stock_applied := true;
    v_paid_at := now();
  elsif v_order.stock_applied = true and p_status <> 'Lunas' then
    if not v_transaction_refunded then
      for v_item in
        select product_id, coalesce(base_quantity, quantity) as quantity
        from public.sales_order_items
        where order_id = p_order_id and product_id is not null
      loop
        insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
        values (v_order.branch_id, v_item.product_id, v_item.quantity, 5)
        on conflict (branch_id, product_id) do update
          set quantity = public.stock_levels.quantity + excluded.quantity;
      end loop;
    end if;

    v_stock_applied := false;
    v_paid_at := null;
  end if;

  update public.sales_orders set
    status = p_status,
    stock_applied = v_stock_applied,
    paid_at = v_paid_at
  where id = p_order_id;

  if p_status = 'Dibatalkan'
    and v_order.transaction_id is not null
    and not v_transaction_refunded
  then
    perform public.fn_refund_transaction_core(
      v_order.transaction_id,
      p_user_id,
      'Pesanan ' || v_order.order_number || ' dibatalkan',
      false
    );

    insert into public.activity_logs (
      id, at, user_id, user_name, role, branch_id, action, detail
    ) values (
      public.gen_id('log'), now(), v_employee.id, v_employee.name,
      v_employee.role, v_order.branch_id, 'Refund',
      'Transaksi pesanan ' || v_order.order_number
        || ' direfund otomatis karena pesanan dibatalkan (sinkronisasi)'
    );
  end if;

  return public.fn_sales_order_json(p_order_id);
end;
$$;
revoke execute on function public.fn_update_sales_order_status(text, text, text)
  from public, anon, authenticated;
grant execute on function public.fn_update_sales_order_status(text, text, text)
  to service_role;

create or replace function public.fn_process_sales_order_credit(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_actor record;
  v_order public.sales_orders%rowtype;
  v_customer public.customers%rowtype;
  v_method text := lower(trim(coalesce(p_payload ->> 'method', '')));
  v_tempo_days integer := nullif(p_payload ->> 'tempoDays', '')::integer;
  v_customer_id text := nullif(trim(coalesce(p_payload ->> 'customerId', '')), '');
  v_due_date date;
  v_item record;
  v_stock integer;
  v_visible boolean;
begin
  select e.id, e.name, e.role, e.branch_id, rp.can_use_cashier,
         rp.can_manage_sales_orders, rp.can_set_tempo_extended,
         rp.can_view_all_branches
  into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = (p_payload ->> 'actorId')
    and e.is_active = true;

  if v_actor.id is null then
    raise exception 'Sesi pengguna tidak ditemukan';
  end if;

  if not (v_actor.can_use_cashier or v_actor.can_manage_sales_orders) then
    raise exception 'Anda tidak berwenang memproses pembayaran pesanan';
  end if;

  if v_method not in ('cod', 'tempo') then
    raise exception 'Metode pembayaran tidak valid';
  end if;

  select * into v_order from public.sales_orders
  where id = (p_payload ->> 'orderId') for update;

  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if not v_actor.can_view_all_branches
    and v_order.branch_id <> v_actor.branch_id then
    raise exception 'Cabang pesanan tidak sesuai akses Anda';
  end if;
  if v_order.status <> 'Menunggu bayar' then
    raise exception 'Pesanan berstatus % tidak bisa diproses', v_order.status;
  end if;
  if v_order.stock_applied then
    raise exception 'Stok pesanan ini sudah diproses';
  end if;

  for v_item in
    select product_id, product_name, coalesce(base_quantity, quantity) as quantity
    from public.sales_order_items
    where order_id = v_order.id and product_id is not null
  loop
    select quantity, is_visible into v_stock, v_visible
    from public.stock_levels
    where branch_id = v_order.branch_id and product_id = v_item.product_id
    for update;

    if not found or coalesce(v_visible, false) is not true then
      raise exception 'Produk % tidak tersedia di cabang ini', v_item.product_name;
    end if;

    v_stock := coalesce(v_stock, 0);

    if v_stock < v_item.quantity then
      raise exception 'Stok % tersisa % unit dasar', v_item.product_name, v_stock;
    end if;

    update public.stock_levels
    set quantity = quantity - v_item.quantity
    where branch_id = v_order.branch_id and product_id = v_item.product_id;
  end loop;

  if v_method = 'cod' then
    update public.sales_orders set
      status = 'COD - menunggu pembayaran',
      payment_scheme = 'cod',
      processed_at = now(),
      stock_applied = true,
      paid_at = null,
      settled_by = null,
      settled_by_name = ''
    where id = v_order.id;

    return public.fn_sales_order_json(v_order.id);
  end if;

  if v_customer_id is null then
    raise exception 'Pilih pelanggan yang boleh tempo';
  end if;

  select * into v_customer from public.customers
  where id = v_customer_id and is_active = true;

  if not found then raise exception 'Pelanggan tidak ditemukan'; end if;
  if v_customer.allow_tempo is not true then
    raise exception 'Pelanggan ini tidak boleh mengambil tempo';
  end if;

  if exists (
    select 1 from public.sales_orders
    where customer_id = v_customer.id
      and payment_scheme = 'tempo'
      and status = 'Tempo - menunggu pembayaran'
  ) then
    raise exception 'Pelanggan ini masih punya tempo aktif yang belum lunas';
  end if;

  if v_tempo_days is null then
    raise exception 'Pilih tenor tempo';
  end if;

  if v_tempo_days not in (3, 7) then
    if not (
      coalesce(v_actor.can_set_tempo_extended, false)
      and v_tempo_days in (14, 30)
    ) then
      raise exception 'Tenor tempo tidak diizinkan untuk role Anda';
    end if;
  end if;

  v_due_date := (now() at time zone 'Asia/Jakarta')::date + v_tempo_days;

  update public.sales_orders set
    status = 'Tempo - menunggu pembayaran',
    payment_scheme = 'tempo',
    tempo_days = v_tempo_days,
    due_date = v_due_date,
    processed_at = now(),
    stock_applied = true,
    paid_at = null,
    customer_id = v_customer.id,
    customer_name = v_customer.name,
    customer_phone = v_customer.phone,
    settled_by = null,
    settled_by_name = ''
  where id = v_order.id;

  return public.fn_sales_order_json(v_order.id);
end;
$$;
revoke execute on function public.fn_process_sales_order_credit(jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_process_sales_order_credit(jsonb)
  to service_role;

create or replace function public.fn_cancel_sales_order_credit(
  p_order_id text,
  p_actor_id text,
  p_reason text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_actor record;
  v_order public.sales_orders%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_item record;
begin
  select e.id, e.name, e.branch_id, rp.can_use_cashier,
         rp.can_manage_sales_orders, rp.can_settle_cod, rp.can_settle_tempo,
         rp.can_view_all_branches
  into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = p_actor_id and e.is_active = true;

  if v_actor.id is null then
    raise exception 'Sesi pengguna tidak ditemukan';
  end if;

  select * into v_order from public.sales_orders
  where id = p_order_id for update;

  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if not v_actor.can_view_all_branches
    and v_order.branch_id <> v_actor.branch_id then
    raise exception 'Cabang pesanan tidak sesuai akses Anda';
  end if;
  if v_order.status = 'Dibatalkan' then
    return public.fn_sales_order_json(p_order_id);
  end if;
  if v_order.status not in ('COD - menunggu pembayaran', 'Tempo - menunggu pembayaran') then
    raise exception 'Hanya pesanan COD atau Tempo yang bisa dibatalkan di sini';
  end if;

  if not (
    v_actor.can_manage_sales_orders
    or v_actor.can_settle_cod
    or v_actor.can_settle_tempo
  ) then
    raise exception 'Anda tidak berwenang membatalkan pesanan ini';
  end if;

  if v_order.stock_applied then
    for v_item in
      select product_id, coalesce(base_quantity, quantity) as quantity
      from public.sales_order_items
      where order_id = p_order_id and product_id is not null
    loop
      insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
      values (v_order.branch_id, v_item.product_id, v_item.quantity, 5)
      on conflict (branch_id, product_id) do update
        set quantity = public.stock_levels.quantity + excluded.quantity;
    end loop;
  end if;

  update public.sales_orders set
    status = 'Dibatalkan',
    stock_applied = false,
    paid_at = null,
    note = case
      when v_reason = '' then note
      else trim(note || case when note = '' then '' else ' · ' end || v_reason)
    end
  where id = p_order_id;

  return public.fn_sales_order_json(p_order_id);
end;
$$;
revoke execute on function public.fn_cancel_sales_order_credit(text, text, text)
  from public, anon, authenticated;
grant execute on function public.fn_cancel_sales_order_credit(text, text, text)
  to service_role;

create or replace function public.fn_delete_sales_order_safe(
  p_order_id text,
  p_actor_id text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_actor record;
  v_order public.sales_orders%rowtype;
  v_item record;
begin
  select e.id, e.name, e.role, e.branch_id, rp.can_delete_sales_order,
         rp.can_delete_transaction, rp.can_view_all_branches
  into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = p_actor_id and e.is_active = true;

  if v_actor.id is null then
    raise exception 'Sesi pengguna tidak ditemukan';
  end if;

  select * into v_order from public.sales_orders
  where id = p_order_id for update;

  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if not v_actor.can_view_all_branches
    and v_order.branch_id <> v_actor.branch_id then
    raise exception 'Cabang pesanan tidak sesuai akses Anda';
  end if;

  if v_order.transaction_id is not null then
    raise exception 'Pesanan ini dibayar lewat kasir. Hapus transaksinya dari Riwayat Transaksi.';
  end if;

  if v_order.status <> 'Dibatalkan' and not coalesce(v_actor.can_delete_transaction, false) then
    raise exception 'Hanya Owner yang bisa menghapus pesanan aktif. Batalkan pesanan terlebih dahulu.';
  end if;
  if v_order.status = 'Dibatalkan' and not (
    coalesce(v_actor.can_delete_sales_order, false)
    or coalesce(v_actor.can_delete_transaction, false)
  ) then
    raise exception 'Role Anda tidak boleh menghapus pesanan';
  end if;

  if v_order.stock_applied then
    for v_item in
      select product_id, coalesce(base_quantity, quantity) as quantity
      from public.sales_order_items
      where order_id = p_order_id and product_id is not null
    loop
      insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
      values (v_order.branch_id, v_item.product_id, v_item.quantity, 5)
      on conflict (branch_id, product_id) do update
        set quantity = public.stock_levels.quantity + excluded.quantity;
    end loop;
  end if;

  delete from public.sales_orders where id = p_order_id;
end;
$$;
revoke execute on function public.fn_delete_sales_order_safe(text, text)
  from public, anon, authenticated;
grant execute on function public.fn_delete_sales_order_safe(text, text)
  to service_role;

create or replace function public.fn_delete_transaction_safe(
  p_transaction_id text,
  p_actor_id text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_actor record;
  v_transaction public.transactions%rowtype;
  v_item record;
  v_order_returned boolean := false;
  v_order record;
begin
  select e.id, e.name, e.role, e.branch_id, rp.can_delete_transaction,
         rp.can_view_all_branches
  into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = p_actor_id and e.is_active = true;

  if v_actor.id is null then
    raise exception 'Sesi pengguna tidak ditemukan';
  end if;
  if coalesce(v_actor.can_delete_transaction, false) is not true then
    raise exception 'Hanya Owner yang bisa menghapus transaksi';
  end if;

  select * into v_transaction from public.transactions
  where id = p_transaction_id for update;

  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if not v_actor.can_view_all_branches
    and v_transaction.branch_id <> v_actor.branch_id then
    raise exception 'Cabang transaksi tidak sesuai akses Anda';
  end if;

  select exists (
    select 1 from public.sales_orders
    where transaction_id = p_transaction_id
      and status = 'Dibatalkan'
      and stock_applied = false
  ) into v_order_returned;

  if v_transaction.refunded_at is null and not v_order_returned then
    for v_item in
      select product_id, coalesce(base_quantity, quantity) as quantity
      from public.transaction_items
      where transaction_id = p_transaction_id and product_id is not null
    loop
      insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
      values (v_transaction.branch_id, v_item.product_id, v_item.quantity, 5)
      on conflict (branch_id, product_id) do update
        set quantity = public.stock_levels.quantity + excluded.quantity;
    end loop;
  end if;

  for v_order in
    select id from public.sales_orders where transaction_id = p_transaction_id
  loop
    update public.sales_orders set stock_applied = false where id = v_order.id;
    delete from public.sales_orders where id = v_order.id;
  end loop;

  delete from public.transactions where id = p_transaction_id;
end;
$$;
revoke execute on function public.fn_delete_transaction_safe(text, text)
  from public, anon, authenticated;
grant execute on function public.fn_delete_transaction_safe(text, text)
  to service_role;
