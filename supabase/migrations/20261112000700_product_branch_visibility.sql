-- Visibilitas produk per cabang.
-- Katalog tetap satu (SKU unik di products), yang diatur hanya apakah produk
-- tampil di katalog cabang tertentu. Produk tidak pernah dihapus dari cabang;
-- baris stock_levels tetap ada agar stok, riwayat, dan laporan lama aman.
--
-- Backfill:
--   * Cabang pertama (KPR.1) tetap menampilkan semua produk lamanya.
--   * Cabang lain hanya menampilkan produk yang stoknya > 0 atau punya riwayat
--     stok masuk, opname, transfer, transaksi, atau pesanan di cabang itu.
--   * Backfill hanya menyentuh baris yang is_visible-nya masih NULL, sehingga
--     aman dijalankan ulang dan tidak membatalkan aksi tampil/sembunyi manual.

-- ===== Kolom penanda =====
alter table public.stock_levels
  add column if not exists is_visible boolean;

update public.stock_levels sl
set is_visible = case
  when sl.quantity = 0
    and sl.branch_id <> coalesce(
      (select b.id from public.branches b
       where b.name = 'KPR.1'
       order by b.created_at asc, b.id asc limit 1),
      (select b.id from public.branches b
       order by b.created_at asc, b.id asc limit 1),
      ''
    )
    and not exists (
      select 1
      from public.stock_ins si
      join public.stock_in_items sii on sii.stock_in_id = si.id
      where si.branch_id = sl.branch_id
        and sii.product_id = sl.product_id
    )
    and not exists (
      select 1
      from public.stock_opnames so
      join public.stock_opname_items soi on soi.opname_id = so.id
      where so.branch_id = sl.branch_id
        and soi.product_id = sl.product_id
    )
    and not exists (
      select 1
      from public.stock_transfers st
      join public.stock_transfer_items sti on sti.transfer_id = st.id
      where (st.from_branch_id = sl.branch_id or st.to_branch_id = sl.branch_id)
        and sti.product_id = sl.product_id
    )
    and not exists (
      select 1
      from public.transactions t
      join public.transaction_items ti on ti.transaction_id = t.id
      where t.branch_id = sl.branch_id
        and ti.product_id = sl.product_id
    )
    and not exists (
      select 1
      from public.sales_orders o
      join public.sales_order_items oi on oi.order_id = o.id
      where o.branch_id = sl.branch_id
        and oi.product_id = sl.product_id
    )
  then false
  else true
end
where sl.is_visible is null;

alter table public.stock_levels
  alter column is_visible set default true;
update public.stock_levels set is_visible = true where is_visible is null;
alter table public.stock_levels
  alter column is_visible set not null;

-- ===== Stok bergerak otomatis menampilkan produk =====
-- Insert selalu tampil. Update yang mengubah stok (masuk, keluar, opname,
-- transfer, refund, pembatalan) juga menampilkan kembali produk. Menyembunyikan
-- produk (stok 0 dan qty tidak berubah) tetap dihormati.
create or replace function private.tg_stock_level_visibility()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.is_visible := true;
  elsif new.quantity is distinct from old.quantity or new.quantity > 0 then
    new.is_visible := true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_stock_level_visibility on public.stock_levels;
create trigger trg_stock_level_visibility
before insert or update on public.stock_levels
for each row execute function private.tg_stock_level_visibility();

-- ===== Produk baru hanya di cabang yang dipilih =====
-- Versi lama membuat baris stok di semua cabang. Keduanya dihapus agar tidak
-- ada jalur lama yang diam-diam menampilkan produk di semua cabang.
drop function if exists public.fn_create_product(
  text, text, text, integer, integer, text, integer
);
drop function if exists public.fn_create_product(
  text, text, text, integer, integer, text, integer, integer
);

create or replace function public.fn_create_product(
  p_name text,
  p_sku text,
  p_category_id text,
  p_cost_price integer,
  p_price integer,
  p_image_url text,
  p_min_stock integer,
  p_wholesale_price integer,
  p_branch_id text
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
begin
  if length(v_name) < 1 then raise exception 'Nama produk wajib diisi'; end if;
  if length(v_sku) < 1 then raise exception 'SKU wajib diisi'; end if;
  if p_cost_price < 0 then raise exception 'Harga modal tidak boleh negatif'; end if;
  if p_price <= 0 then raise exception 'Harga jual harus lebih dari 0'; end if;
  if v_wholesale_price < 0 then raise exception 'Harga grosir tidak boleh negatif'; end if;
  if p_min_stock < 0 then raise exception 'Batas stok tidak boleh negatif'; end if;
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
    image_url, is_active
  ) values (
    v_id, v_name, v_sku, p_category_id, p_cost_price, p_price,
    v_wholesale_price, nullif(trim(coalesce(p_image_url, '')), ''), true
  );

  -- Hanya cabang pembuat yang mendapat baris stok (dan tampil di katalognya).
  insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
  values (p_branch_id, v_id, 0, p_min_stock);

  return v_id;
end;
$$;
revoke execute on function public.fn_create_product(
  text, text, text, integer, integer, text, integer, integer, text
) from public, anon, authenticated;
grant execute on function public.fn_create_product(
  text, text, text, integer, integer, text, integer, integer, text
) to service_role;

-- ===== Import Excel juga hanya untuk cabang aktif =====
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

-- ===== Izin baru =====
alter table public.role_permissions
  add column if not exists can_manage_product_visibility boolean not null default false;

update public.role_permissions set can_manage_product_visibility = true
where role in ('Owner', 'Manager', 'Inventory');

update public.role_permissions set can_manage_product_visibility = true
where role = 'Owner';

create or replace function private.has_permission(permission text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select case permission
       when 'can_apply_discount'             then can_apply_discount
       when 'can_cancel_transaction'         then can_cancel_transaction
       when 'can_manage_products'            then can_manage_products
       when 'can_manage_product_visibility'  then can_manage_product_visibility
       when 'can_create_sales_order'         then can_create_sales_order
       when 'can_manage_sales_orders'        then can_manage_sales_orders
       when 'can_export_reports'             then can_export_reports
       when 'can_view_all_branches'          then can_view_all_branches
       when 'can_view_all_attendance'        then can_view_all_attendance
       when 'can_approve_leave'              then can_approve_leave
       when 'can_manage_employees'           then can_manage_employees
       when 'can_manage_branches'            then can_manage_branches
       when 'can_manage_settings'            then can_manage_settings
       when 'can_access_cash_book'           then can_access_cash_book
       when 'can_use_cashier'                then can_use_cashier
       when 'can_view_products'              then can_view_products
       when 'can_delete_sales_order'         then can_delete_sales_order
       when 'can_view_dashboard'             then can_view_dashboard
       when 'can_access_attendance'          then can_access_attendance
       when 'can_access_kasbon'              then can_access_kasbon
       when 'can_approve_kasbon_accounting'  then can_approve_kasbon_accounting
       when 'can_approve_kasbon_manager'     then can_approve_kasbon_manager
       when 'can_approve_kasbon_owner'       then can_approve_kasbon_owner
       when 'can_settle_kasbon'              then can_settle_kasbon
       when 'can_view_all_kasbon'            then can_view_all_kasbon
       when 'can_settle_cod'                 then can_settle_cod
       when 'can_settle_tempo'               then can_settle_tempo
       when 'can_set_tempo_extended'         then can_set_tempo_extended
       when 'can_set_customer_tempo'         then can_set_customer_tempo
       when 'can_delete_transaction'         then can_delete_transaction
       else false end
     from public.role_permissions
     where role = (select private.current_role())),
    false);
$$;
revoke execute on function private.has_permission(text) from public, anon;
grant execute on function private.has_permission(text) to authenticated;

create or replace function public.fn_update_role_permissions_matrix(p_payload jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_role text;
  v_permissions jsonb;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Data hak akses tidak valid';
  end if;

  for v_role, v_permissions in select key, value from jsonb_each(p_payload)
  loop
    if v_role = 'Owner' then
      continue;
    end if;
    if not exists (select 1 from public.role_permissions where role = v_role) then
      raise exception 'Role % tidak ditemukan', v_role;
    end if;

    update public.role_permissions set
      can_view_dashboard = coalesce((v_permissions ->> 'canViewDashboard')::boolean, can_view_dashboard),
      can_access_attendance = coalesce((v_permissions ->> 'canAccessAttendance')::boolean, can_access_attendance),
      can_access_cash_book = coalesce((v_permissions ->> 'canAccessCashBook')::boolean, can_access_cash_book),
      can_apply_discount = coalesce((v_permissions ->> 'canApplyDiscount')::boolean, can_apply_discount),
      can_cancel_transaction = coalesce((v_permissions ->> 'canCancelTransaction')::boolean, can_cancel_transaction),
      can_manage_products = coalesce((v_permissions ->> 'canManageProducts')::boolean, can_manage_products),
      can_manage_product_visibility = coalesce((v_permissions ->> 'canManageProductVisibility')::boolean, can_manage_product_visibility),
      can_create_sales_order = coalesce((v_permissions ->> 'canCreateSalesOrder')::boolean, can_create_sales_order),
      can_manage_sales_orders = coalesce((v_permissions ->> 'canManageSalesOrders')::boolean, can_manage_sales_orders),
      can_delete_sales_order = coalesce((v_permissions ->> 'canDeleteSalesOrder')::boolean, can_delete_sales_order),
      can_export_reports = coalesce((v_permissions ->> 'canExportReports')::boolean, can_export_reports),
      can_view_all_branches = coalesce((v_permissions ->> 'canViewAllBranches')::boolean, can_view_all_branches),
      can_view_all_attendance = coalesce((v_permissions ->> 'canViewAllAttendance')::boolean, can_view_all_attendance),
      can_approve_leave = coalesce((v_permissions ->> 'canApproveLeave')::boolean, can_approve_leave),
      can_manage_employees = coalesce((v_permissions ->> 'canManageEmployees')::boolean, can_manage_employees),
      can_manage_branches = coalesce((v_permissions ->> 'canManageBranches')::boolean, can_manage_branches),
      can_manage_settings = coalesce((v_permissions ->> 'canManageSettings')::boolean, can_manage_settings),
      can_use_cashier = coalesce((v_permissions ->> 'canUseCashier')::boolean, can_use_cashier),
      can_view_products = coalesce((v_permissions ->> 'canViewProducts')::boolean, can_view_products),
      can_access_kasbon = coalesce((v_permissions ->> 'canAccessKasbon')::boolean, can_access_kasbon),
      can_approve_kasbon_accounting = coalesce((v_permissions ->> 'canApproveKasbonAccounting')::boolean, can_approve_kasbon_accounting),
      can_approve_kasbon_manager = coalesce((v_permissions ->> 'canApproveKasbonManager')::boolean, can_approve_kasbon_manager),
      can_approve_kasbon_owner = coalesce((v_permissions ->> 'canApproveKasbonOwner')::boolean, can_approve_kasbon_owner),
      can_settle_kasbon = coalesce((v_permissions ->> 'canSettleKasbon')::boolean, can_settle_kasbon),
      can_view_all_kasbon = coalesce((v_permissions ->> 'canViewAllKasbon')::boolean, can_view_all_kasbon),
      can_settle_cod = coalesce((v_permissions ->> 'canSettleCod')::boolean, can_settle_cod),
      can_settle_tempo = coalesce((v_permissions ->> 'canSettleTempo')::boolean, can_settle_tempo),
      can_set_tempo_extended = coalesce((v_permissions ->> 'canSetTempoExtended')::boolean, can_set_tempo_extended),
      can_set_customer_tempo = coalesce((v_permissions ->> 'canSetCustomerTempo')::boolean, can_set_customer_tempo),
      can_delete_transaction = coalesce((v_permissions ->> 'canDeleteTransaction')::boolean, can_delete_transaction)
    where role = v_role;
  end loop;
end;
$$;
revoke execute on function public.fn_update_role_permissions_matrix(jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_update_role_permissions_matrix(jsonb)
  to service_role;

-- ===== Aksi tampil / sembunyikan =====
create or replace function public.fn_set_product_branch_visibility(
  p_product_id text,
  p_branch_id text,
  p_visible boolean,
  p_actor_id text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_actor record;
  v_quantity integer;
begin
  select e.id, e.name, e.branch_id,
         rp.can_manage_product_visibility, rp.can_view_all_branches
  into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = p_actor_id and e.is_active = true;

  if v_actor.id is null then
    raise exception 'Sesi pengguna tidak ditemukan';
  end if;

  if coalesce(v_actor.can_manage_product_visibility, false) is not true then
    raise exception 'Anda tidak berwenang mengatur visibilitas produk';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Produk tidak ditemukan';
  end if;
  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;
  if coalesce(v_actor.can_view_all_branches, false) is not true
    and p_branch_id <> v_actor.branch_id then
    raise exception 'Cabang tidak sesuai akses Anda';
  end if;

  select quantity into v_quantity
  from public.stock_levels
  where branch_id = p_branch_id and product_id = p_product_id
  for update;

  if p_visible then
    insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
    values (p_branch_id, p_product_id, 0, 5)
    on conflict (branch_id, product_id) do update
      set is_visible = true;
  else
    if v_quantity is null then
      raise exception 'Produk ini tidak terdaftar di cabang tersebut';
    end if;
    if v_quantity <> 0 then
      raise exception
        'Stok cabang ini masih % pcs. Kosongkan stok dulu sebelum disembunyikan.',
        v_quantity;
    end if;

    update public.stock_levels
    set is_visible = false
    where branch_id = p_branch_id and product_id = p_product_id;
  end if;
end;
$$;
revoke execute on function public.fn_set_product_branch_visibility(
  text, text, boolean, text
) from public, anon, authenticated;
grant execute on function public.fn_set_product_branch_visibility(
  text, text, boolean, text
) to service_role;

-- ===== Validasi jual: produk tersembunyi / tidak terdaftar ditolak =====
-- Trigger dipasang di item agar semua jalur (pesanan sales dan transaksi
-- kasir) otomatis tervalidasi tanpa menduplikasi fungsi transaksi yang besar.
create or replace function private.tg_require_visible_product()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_branch_id text;
  v_product_name text;
begin
  if new.product_id is null then
    return new;
  end if;

  if tg_table_name = 'transaction_items' then
    select branch_id into v_branch_id
    from public.transactions where id = new.transaction_id;
  else
    select branch_id into v_branch_id
    from public.sales_orders where id = new.order_id;
  end if;

  if v_branch_id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.stock_levels
    where branch_id = v_branch_id
      and product_id = new.product_id
      and is_visible = true
  ) then
    select name into v_product_name
    from public.products where id = new.product_id;

    raise exception 'Produk % tidak tersedia di cabang ini',
      coalesce(v_product_name, 'ini');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sales_order_items_visible on public.sales_order_items;
create trigger trg_sales_order_items_visible
before insert on public.sales_order_items
for each row execute function private.tg_require_visible_product();

drop trigger if exists trg_transaction_items_visible on public.transaction_items;
create trigger trg_transaction_items_visible
before insert on public.transaction_items
for each row execute function private.tg_require_visible_product();

-- ===== COD/Tempo: cek visibilitas saat stok diproses =====
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

  -- Stok keluar sejak pesanan diproses (COD maupun Tempo).
  for v_item in
    select product_id, product_name, quantity
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
      raise exception 'Stok % tersisa % pcs', v_item.product_name, v_stock;
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

  -- ===== Tempo =====
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

  -- Jatuh tempo dihitung dari hari pesanan diproses/dikirim.
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
