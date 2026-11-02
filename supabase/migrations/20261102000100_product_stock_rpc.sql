-- RPC atomik untuk master produk, kategori, dan stok per cabang.
-- Dipanggil hanya dari server action memakai service_role.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant execute on function public.gen_id(text) to service_role;

-- ===== Kategori =====
create or replace function public.fn_create_category(p_name text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_name text := trim(p_name);
  v_id text;
begin
  if length(v_name) < 1 then
    raise exception 'Nama kategori wajib diisi';
  end if;

  if exists (
    select 1 from public.categories c
    where lower(trim(c.name)) = lower(v_name)
  ) then
    raise exception 'Nama kategori sudah ada';
  end if;

  v_id := public.gen_id('cat');

  insert into public.categories (id, name, is_active)
  values (v_id, v_name, true);

  return v_id;
end;
$$;

create or replace function public.fn_update_category(p_id text, p_name text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_name text := trim(p_name);
begin
  if length(v_name) < 1 then
    raise exception 'Nama kategori wajib diisi';
  end if;

  if not exists (select 1 from public.categories where id = p_id) then
    raise exception 'Kategori tidak ditemukan';
  end if;

  if exists (
    select 1 from public.categories c
    where c.id <> p_id and lower(trim(c.name)) = lower(v_name)
  ) then
    raise exception 'Nama kategori sudah ada';
  end if;

  update public.categories set name = v_name where id = p_id;
end;
$$;

create or replace function public.fn_delete_category(p_id text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.categories where id = p_id) then
    raise exception 'Kategori tidak ditemukan';
  end if;

  if exists (select 1 from public.products where category_id = p_id) then
    raise exception 'Kategori masih dipakai produk dan tidak bisa dihapus';
  end if;

  delete from public.categories where id = p_id;
end;
$$;

-- ===== Produk =====
create or replace function public.fn_create_product(
  p_name text,
  p_sku text,
  p_category_id text,
  p_cost_price integer,
  p_price integer,
  p_image_url text,
  p_min_stock integer
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_id text;
  v_name text := trim(p_name);
  v_sku text := upper(trim(p_sku));
begin
  if length(v_name) < 1 then raise exception 'Nama produk wajib diisi'; end if;
  if length(v_sku) < 1 then raise exception 'SKU wajib diisi'; end if;
  if p_cost_price < 0 then raise exception 'Harga modal tidak boleh negatif'; end if;
  if p_price <= 0 then raise exception 'Harga jual harus lebih dari 0'; end if;
  if p_min_stock < 0 then raise exception 'Batas stok tidak boleh negatif'; end if;
  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'Kategori tidak ditemukan';
  end if;
  if exists (select 1 from public.products where lower(sku) = lower(v_sku)) then
    raise exception 'SKU % sudah dipakai produk lain', v_sku;
  end if;

  v_id := public.gen_id('prod');

  insert into public.products (
    id, name, sku, category_id, cost_price, price, image_url, is_active
  ) values (
    v_id, v_name, v_sku, p_category_id, p_cost_price, p_price,
    nullif(trim(coalesce(p_image_url, '')), ''), true
  );

  insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
  select b.id, v_id, 0, p_min_stock from public.branches b;

  return v_id;
end;
$$;

create or replace function public.fn_update_product(
  p_id text,
  p_name text,
  p_sku text,
  p_category_id text,
  p_cost_price integer,
  p_price integer,
  p_image_url text,
  p_min_stock integer
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_name text := trim(p_name);
  v_sku text := upper(trim(p_sku));
begin
  if not exists (select 1 from public.products where id = p_id) then
    raise exception 'Produk tidak ditemukan';
  end if;
  if length(v_name) < 1 then raise exception 'Nama produk wajib diisi'; end if;
  if length(v_sku) < 1 then raise exception 'SKU wajib diisi'; end if;
  if p_cost_price < 0 then raise exception 'Harga modal tidak boleh negatif'; end if;
  if p_price <= 0 then raise exception 'Harga jual harus lebih dari 0'; end if;
  if p_min_stock < 0 then raise exception 'Batas stok tidak boleh negatif'; end if;
  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'Kategori tidak ditemukan';
  end if;
  if exists (
    select 1 from public.products
    where id <> p_id and lower(sku) = lower(v_sku)
  ) then
    raise exception 'SKU % sudah dipakai produk lain', v_sku;
  end if;

  update public.products set
    name = v_name,
    sku = v_sku,
    category_id = p_category_id,
    cost_price = p_cost_price,
    price = p_price,
    image_url = nullif(trim(coalesce(p_image_url, '')), '')
  where id = p_id;

  update public.stock_levels
  set min_stock = p_min_stock
  where product_id = p_id;
end;
$$;

create or replace function public.fn_set_product_active(p_id text, p_active boolean)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.products where id = p_id) then
    raise exception 'Produk tidak ditemukan';
  end if;

  update public.products set is_active = p_active where id = p_id;
end;
$$;

create or replace function public.fn_delete_product(p_id text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.products where id = p_id) then
    raise exception 'Produk tidak ditemukan';
  end if;

  delete from public.products where id = p_id;
end;
$$;

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
  v_total integer := 0;
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
    select * from jsonb_to_recordset(p_items) as x(product_id text, quantity integer)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah stok harus lebih dari 0';
    end if;

    select name into v_product_name
    from public.products where id = v_item.product_id;

    if v_product_name is null then
      raise exception 'Produk tidak ditemukan';
    end if;

    insert into public.stock_in_items (id, stock_in_id, product_id, product_name, quantity)
    values (public.gen_id('sii'), v_id, v_item.product_id, v_product_name, v_item.quantity);

    insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
    values (p_branch_id, v_item.product_id, v_item.quantity, 5)
    on conflict (branch_id, product_id) do update
      set quantity = public.stock_levels.quantity + excluded.quantity;

    v_total := v_total + v_item.quantity;
  end loop;

  return v_id;
end;
$$;

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
    v_physical := coalesce((p_physical ->> v_product.id)::integer, v_system);

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
    select * from jsonb_to_recordset(p_items) as x(product_id text, quantity integer)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah stok harus lebih dari 0';
    end if;

    select name into v_product_name
    from public.products where id = v_item.product_id;

    if v_product_name is null then
      raise exception 'Produk tidak ditemukan';
    end if;

    select quantity into v_stock
    from public.stock_levels
    where branch_id = p_from_branch_id and product_id = v_item.product_id
    for update;

    if coalesce(v_stock, 0) < v_item.quantity then
      raise exception 'Stok % tersisa % pcs', v_product_name, coalesce(v_stock, 0);
    end if;

    insert into public.stock_transfer_items (
      id, transfer_id, product_id, product_name, quantity
    ) values (
      public.gen_id('tri'), v_id, v_item.product_id, v_product_name, v_item.quantity
    );

    update public.stock_levels
    set quantity = quantity - v_item.quantity
    where branch_id = p_from_branch_id and product_id = v_item.product_id;

    insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
    values (p_to_branch_id, v_item.product_id, v_item.quantity, 5)
    on conflict (branch_id, product_id) do update
      set quantity = public.stock_levels.quantity + excluded.quantity;
  end loop;

  return v_id;
end;
$$;

-- ===== Potong/restore stok untuk kasir, refund, dan pesanan =====
create or replace function public.fn_adjust_stock(
  p_branch_id text,
  p_items jsonb,
  p_direction text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_item record;
  v_stock integer;
  v_product_name text;
begin
  if p_direction not in ('deduct', 'restore') then
    raise exception 'Arah stok tidak valid';
  end if;
  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Item stok kosong';
  end if;

  for v_item in
    select * from jsonb_to_recordset(p_items) as x(product_id text, quantity integer)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah stok harus lebih dari 0';
    end if;

    if p_direction = 'deduct' then
      select name into v_product_name
      from public.products where id = v_item.product_id;

      if v_product_name is null then
        raise exception 'Produk tidak ditemukan';
      end if;

      select quantity into v_stock
      from public.stock_levels
      where branch_id = p_branch_id and product_id = v_item.product_id
      for update;

      v_stock := coalesce(v_stock, 0);

      if v_stock < v_item.quantity then
        raise exception 'Stok % tersisa % pcs', v_product_name, v_stock;
      end if;

      update public.stock_levels
      set quantity = quantity - v_item.quantity
      where branch_id = p_branch_id and product_id = v_item.product_id;
    else
      insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
      values (p_branch_id, v_item.product_id, v_item.quantity, 5)
      on conflict (branch_id, product_id) do update
        set quantity = public.stock_levels.quantity + excluded.quantity;
    end if;
  end loop;
end;
$$;

-- ===== Import Excel =====
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
      price integer, stock integer, min_stock integer
    )
  loop
    if exists (select 1 from public.products where lower(sku) = lower(trim(v_row.sku))) then
      raise exception 'SKU % duplikat saat impor', v_row.sku;
    end if;
    if not exists (select 1 from public.categories where id = v_row.category_id) then
      raise exception 'Kategori % tidak ditemukan', v_row.category_id;
    end if;

    v_id := public.gen_id('prod');

    insert into public.products (
      id, name, sku, category_id, cost_price, price, is_active
    ) values (
      v_id, trim(v_row.name), upper(trim(v_row.sku)), v_row.category_id,
      coalesce(v_row.cost_price, 0), coalesce(v_row.price, 0), true
    );

    insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
    select b.id, v_id,
      case when b.id = p_branch_id then coalesce(v_row.stock, 0) else 0 end,
      coalesce(v_row.min_stock, 5)
    from public.branches b;

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

-- ===== Bootstrap data lokal sekali =====
create or replace function public.fn_bootstrap_product_stock(p_payload jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('kpr-product-stock-bootstrap'));

  if exists (select 1 from public.products limit 1) then
    return false;
  end if;

  insert into public.branches (id, name, address, phone, is_active)
  select id, name, address, phone, is_active
  from jsonb_to_recordset(coalesce(p_payload -> 'branches', '[]'::jsonb))
    as x(id text, name text, address text, phone text, is_active boolean)
  on conflict (id) do nothing;

  insert into public.employees (
    id, name, phone, initials, role, branch_id, is_active
  )
  select id, name, phone, initials, role, branch_id, is_active
  from jsonb_to_recordset(coalesce(p_payload -> 'employees', '[]'::jsonb))
    as x(
      id text, name text, phone text, initials text,
      role text, branch_id text, is_active boolean
    )
  on conflict (id) do nothing;

  insert into public.categories (id, name, is_active)
  select id, name, is_active
  from jsonb_to_recordset(coalesce(p_payload -> 'categories', '[]'::jsonb))
    as x(id text, name text, is_active boolean)
  on conflict (id) do nothing;

  insert into public.products (
    id, name, sku, category_id, cost_price, price, image_url, is_active
  )
  select id, name, sku, category_id, cost_price, price, image_url, is_active
  from jsonb_to_recordset(coalesce(p_payload -> 'products', '[]'::jsonb))
    as x(
      id text, name text, sku text, category_id text,
      cost_price integer, price integer, image_url text, is_active boolean
    )
  on conflict (id) do nothing;

  insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
  select branch_id, product_id, quantity, min_stock
  from jsonb_to_recordset(coalesce(p_payload -> 'stock_levels', '[]'::jsonb))
    as x(branch_id text, product_id text, quantity integer, min_stock integer)
  on conflict (branch_id, product_id) do nothing;

  insert into public.stock_ins (id, branch_id, date, note, user_id, created_at)
  select id, branch_id, date, note, user_id, coalesce(created_at, now())
  from jsonb_to_recordset(coalesce(p_payload -> 'stock_ins', '[]'::jsonb))
    as x(
      id text, branch_id text, date date, note text,
      user_id text, created_at timestamptz
    )
  on conflict (id) do nothing;

  insert into public.stock_in_items (
    id, stock_in_id, product_id, product_name, quantity
  )
  select public.gen_id('sii'), stock_in_id, product_id, product_name, quantity
  from jsonb_to_recordset(coalesce(p_payload -> 'stock_in_items', '[]'::jsonb))
    as x(stock_in_id text, product_id text, product_name text, quantity integer);

  insert into public.stock_opnames (id, branch_id, date, note, user_id, created_at)
  select id, branch_id, date, note, user_id, coalesce(created_at, now())
  from jsonb_to_recordset(coalesce(p_payload -> 'stock_opnames', '[]'::jsonb))
    as x(
      id text, branch_id text, date date, note text,
      user_id text, created_at timestamptz
    )
  on conflict (id) do nothing;

  insert into public.stock_opname_items (
    id, opname_id, product_id, product_name,
    system_quantity, physical_quantity, difference
  )
  select public.gen_id('opi'), opname_id, product_id, product_name,
    system_quantity, physical_quantity, difference
  from jsonb_to_recordset(coalesce(p_payload -> 'stock_opname_items', '[]'::jsonb))
    as x(
      opname_id text, product_id text, product_name text,
      system_quantity integer, physical_quantity integer, difference integer
    );

  insert into public.stock_transfers (
    id, from_branch_id, to_branch_id, date, note, user_id, created_at
  )
  select id, from_branch_id, to_branch_id, date, note, user_id, coalesce(created_at, now())
  from jsonb_to_recordset(coalesce(p_payload -> 'stock_transfers', '[]'::jsonb))
    as x(
      id text, from_branch_id text, to_branch_id text, date date,
      note text, user_id text, created_at timestamptz
    )
  on conflict (id) do nothing;

  insert into public.stock_transfer_items (
    id, transfer_id, product_id, product_name, quantity
  )
  select public.gen_id('tri'), transfer_id, product_id, product_name, quantity
  from jsonb_to_recordset(coalesce(p_payload -> 'stock_transfer_items', '[]'::jsonb))
    as x(transfer_id text, product_id text, product_name text, quantity integer);

  return true;
end;
$$;

-- ===== Hak akses: hanya server/service role =====
revoke execute on function public.fn_create_category(text) from public, anon, authenticated;
revoke execute on function public.fn_update_category(text, text) from public, anon, authenticated;
revoke execute on function public.fn_delete_category(text) from public, anon, authenticated;
revoke execute on function public.fn_create_product(text, text, text, integer, integer, text, integer) from public, anon, authenticated;
revoke execute on function public.fn_update_product(text, text, text, text, integer, integer, text, integer) from public, anon, authenticated;
revoke execute on function public.fn_set_product_active(text, boolean) from public, anon, authenticated;
revoke execute on function public.fn_delete_product(text) from public, anon, authenticated;
revoke execute on function public.fn_add_stock_in(text, date, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.fn_submit_opname(text, date, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.fn_transfer_stock(text, text, date, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.fn_adjust_stock(text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.fn_import_products(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.fn_bootstrap_product_stock(jsonb) from public, anon, authenticated;

grant execute on function public.fn_create_category(text) to service_role;
grant execute on function public.fn_update_category(text, text) to service_role;
grant execute on function public.fn_delete_category(text) to service_role;
grant execute on function public.fn_create_product(text, text, text, integer, integer, text, integer) to service_role;
grant execute on function public.fn_update_product(text, text, text, text, integer, integer, text, integer) to service_role;
grant execute on function public.fn_set_product_active(text, boolean) to service_role;
grant execute on function public.fn_delete_product(text) to service_role;
grant execute on function public.fn_add_stock_in(text, date, text, text, jsonb) to service_role;
grant execute on function public.fn_submit_opname(text, date, text, text, jsonb) to service_role;
grant execute on function public.fn_transfer_stock(text, text, date, text, text, jsonb) to service_role;
grant execute on function public.fn_adjust_stock(text, jsonb, text) to service_role;
grant execute on function public.fn_import_products(text, text, jsonb) to service_role;
grant execute on function public.fn_bootstrap_product_stock(jsonb) to service_role;
