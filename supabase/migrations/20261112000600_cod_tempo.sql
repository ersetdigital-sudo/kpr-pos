-- Pembayaran COD & Tempo (piutang) untuk Pesanan Sales.
-- Aditif dan idempoten: kolom baru punya default, semua objek dibuat dengan
-- `if not exists` / `create or replace`, dan data lama otomatis dianggap tunai.
--
-- Aturan uang:
--   * COD/Tempo diproses -> stok keluar, status "COD/Tempo - menunggu pembayaran".
--   * Lunas -> paid_at terisi (tanpa transaction_id) sehingga collector penjualan
--     yang sudah ada menghitung pemasukan Buku Kas tepat satu kali.
--   * Batal -> stok dikembalikan satu kali (stock_applied=false), tanpa pemasukan.

-- ===== Master pelanggan =====
create table if not exists public.customers (
  id          text primary key,
  name        text not null,
  phone       text not null default '',
  allow_tempo boolean not null default false,
  is_active   boolean not null default true,
  branch_id   text references public.branches(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists customers_name_idx
  on public.customers (lower(name));
create index if not exists customers_branch_idx
  on public.customers (branch_id);

-- Pelanggan lama diambil dari nama pada pesanan sales (sekali saja per nama).
insert into public.customers (id, name, phone, allow_tempo, branch_id)
select
  public.gen_id('cust'),
  trim(o.customer_name),
  coalesce(max(o.customer_phone), ''),
  false,
  max(o.branch_id)
from public.sales_orders o
where trim(coalesce(o.customer_name, '')) <> ''
  and not exists (
    select 1 from public.customers c
    where lower(trim(c.name)) = lower(trim(o.customer_name))
  )
group by trim(o.customer_name);

-- ===== Kolom pesanan =====
alter table public.sales_orders
  add column if not exists customer_id text
  references public.customers(id) on delete set null;
alter table public.sales_orders
  add column if not exists payment_scheme text not null default 'cash';
alter table public.sales_orders
  add column if not exists tempo_days integer;
alter table public.sales_orders
  add column if not exists due_date date;
alter table public.sales_orders
  add column if not exists processed_at timestamptz;
alter table public.sales_orders
  add column if not exists settled_by text references public.employees(id) on delete set null;
alter table public.sales_orders
  add column if not exists settled_by_name text not null default '';

create index if not exists sales_orders_customer_idx
  on public.sales_orders (customer_id);
create index if not exists sales_orders_due_date_idx
  on public.sales_orders (due_date);

-- Satu pelanggan hanya boleh punya satu tempo aktif. Divalidasi juga di RPC.
create unique index if not exists sales_orders_active_tempo_idx
  on public.sales_orders (customer_id)
  where payment_scheme = 'tempo'
    and status = 'Tempo - menunggu pembayaran'
    and customer_id is not null;

-- Tautkan pesanan lama ke pelanggan yang namanya sama.
update public.sales_orders o set customer_id = c.id
from public.customers c
where o.customer_id is null
  and trim(coalesce(o.customer_name, '')) <> ''
  and lower(trim(o.customer_name)) = lower(trim(c.name));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_orders_payment_scheme_check'
      and conrelid = 'public.sales_orders'::regclass
  ) then
    alter table public.sales_orders
      add constraint sales_orders_payment_scheme_check
      check (payment_scheme in ('cash', 'cod', 'tempo'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_orders_tempo_days_check'
      and conrelid = 'public.sales_orders'::regclass
  ) then
    alter table public.sales_orders
      add constraint sales_orders_tempo_days_check
      check (tempo_days is null or tempo_days in (3, 7, 14, 30));
  end if;
end;
$$;

-- ===== Izin role baru =====
alter table public.role_permissions
  add column if not exists can_settle_cod boolean not null default false;
alter table public.role_permissions
  add column if not exists can_settle_tempo boolean not null default false;
alter table public.role_permissions
  add column if not exists can_set_tempo_extended boolean not null default false;
alter table public.role_permissions
  add column if not exists can_set_customer_tempo boolean not null default false;
alter table public.role_permissions
  add column if not exists can_delete_transaction boolean not null default false;

update public.role_permissions set
  can_settle_cod = true,
  can_settle_tempo = true
where role in ('Owner', 'Manager', 'Supervisor', 'Cashier', 'Sales', 'Accountant');

update public.role_permissions set can_set_customer_tempo = true
where role in ('Owner', 'Manager');

update public.role_permissions set can_delete_transaction = true
where role = 'Owner';

-- Owner selalu memegang seluruh akses.
update public.role_permissions set
  can_settle_cod = true,
  can_settle_tempo = true,
  can_set_tempo_extended = true,
  can_set_customer_tempo = true,
  can_delete_transaction = true
where role = 'Owner';

-- ===== Helper izin RLS mengenal kolom baru =====
create or replace function private.has_permission(permission text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select case permission
       when 'can_apply_discount'             then can_apply_discount
       when 'can_cancel_transaction'         then can_cancel_transaction
       when 'can_manage_products'            then can_manage_products
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

-- ===== Matriks hak akses =====
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
revoke execute on function public.fn_update_role_permissions_matrix(jsonb) from public, anon, authenticated;
grant execute on function public.fn_update_role_permissions_matrix(jsonb) to service_role;

-- ===== JSON pesanan (termasuk data COD/Tempo) =====
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
revoke execute on function public.fn_sales_order_json(text) from public, anon, authenticated;
grant execute on function public.fn_sales_order_json(text) to service_role;

-- ===== Simpan pelanggan =====
create or replace function public.fn_save_customer(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_actor record;
  v_id text := nullif(trim(coalesce(p_payload ->> 'id', '')), '');
  v_name text := trim(coalesce(p_payload ->> 'name', ''));
  v_phone text := trim(coalesce(p_payload ->> 'phone', ''));
  v_allow_tempo boolean := coalesce((p_payload ->> 'allowTempo')::boolean, false);
  v_branch_id text := nullif(trim(coalesce(p_payload ->> 'branchId', '')), '');
  v_existing record;
  v_customer record;
begin
  select e.id, e.branch_id, e.role, rp.can_use_cashier, rp.can_manage_sales_orders,
         rp.can_create_sales_order, rp.can_set_customer_tempo
  into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = (p_payload ->> 'actorId')
    and e.is_active = true;

  if v_actor.id is null then
    raise exception 'Sesi pengguna tidak ditemukan';
  end if;

  if not (
    v_actor.can_use_cashier
    or v_actor.can_manage_sales_orders
    or v_actor.can_create_sales_order
    or v_actor.can_set_customer_tempo
  ) then
    raise exception 'Anda tidak punya akses data pelanggan';
  end if;

  if length(v_name) < 2 then
    raise exception 'Nama pelanggan minimal 2 karakter';
  end if;

  if v_id is null then
    if v_allow_tempo and not v_actor.can_set_customer_tempo then
      raise exception 'Anda tidak berwenang memberi akses tempo';
    end if;
    if exists (
      select 1 from public.customers
      where is_active = true and lower(trim(name)) = lower(v_name)
    ) then
      raise exception 'Pelanggan dengan nama ini sudah ada';
    end if;

    v_id := public.gen_id('cust');
    insert into public.customers (id, name, phone, allow_tempo, branch_id)
    values (
      v_id, v_name, v_phone, v_allow_tempo,
      coalesce(v_branch_id, v_actor.branch_id)
    );
  else
    select * into v_existing from public.customers where id = v_id;
    if not found then raise exception 'Pelanggan tidak ditemukan'; end if;

    if v_allow_tempo <> v_existing.allow_tempo
      and not v_actor.can_set_customer_tempo then
      raise exception 'Hanya role berwenang yang bisa mengubah penanda boleh tempo';
    end if;

    update public.customers set
      name = v_name,
      phone = v_phone,
      allow_tempo = v_allow_tempo,
      updated_at = now()
    where id = v_id;

    -- Nama pada pesanan lama ikut diselaraskan agar riwayat tetap konsisten.
    update public.sales_orders set
      customer_name = v_name,
      customer_phone = v_phone
    where customer_id = v_id;
  end if;

  select id, name, phone, allow_tempo, is_active, branch_id
  into v_customer
  from public.customers where id = v_id;

  return jsonb_build_object(
    'id', v_customer.id,
    'name', v_customer.name,
    'phone', v_customer.phone,
    'allowTempo', v_customer.allow_tempo,
    'isActive', v_customer.is_active,
    'branchId', v_customer.branch_id
  );
end;
$$;
revoke execute on function public.fn_save_customer(jsonb) from public, anon, authenticated;
grant execute on function public.fn_save_customer(jsonb) to service_role;

-- ===== Proses pembayaran COD / Tempo =====
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
    select quantity into v_stock
    from public.stock_levels
    where branch_id = v_order.branch_id and product_id = v_item.product_id
    for update;

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
revoke execute on function public.fn_process_sales_order_credit(jsonb) from public, anon, authenticated;
grant execute on function public.fn_process_sales_order_credit(jsonb) to service_role;

-- ===== Tandai lunas COD / Tempo =====
create or replace function public.fn_settle_sales_order_credit(
  p_order_id text,
  p_actor_id text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_actor record;
  v_order public.sales_orders%rowtype;
begin
  select e.id, e.name, e.branch_id, rp.can_settle_cod, rp.can_settle_tempo,
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

  -- Idempotent: pelunasan ganda tidak menambah pemasukan dua kali.
  if v_order.status = 'Lunas' then
    return public.fn_sales_order_json(p_order_id);
  end if;

  if v_order.status = 'COD - menunggu pembayaran' then
    if coalesce(v_actor.can_settle_cod, false) is not true then
      raise exception 'Anda tidak berwenang menandai lunas COD';
    end if;
  elsif v_order.status = 'Tempo - menunggu pembayaran' then
    if coalesce(v_actor.can_settle_tempo, false) is not true then
      raise exception 'Anda tidak berwenang menandai lunas tempo';
    end if;
  else
    raise exception 'Hanya pesanan COD atau Tempo yang bisa ditandai lunas';
  end if;

  -- Stok sudah keluar saat diproses; pelunasan hanya mencatat uang masuk.
  update public.sales_orders set
    status = 'Lunas',
    paid_at = now(),
    settled_by = v_actor.id,
    settled_by_name = v_actor.name
  where id = p_order_id;

  return public.fn_sales_order_json(p_order_id);
end;
$$;
revoke execute on function public.fn_settle_sales_order_credit(text, text) from public, anon, authenticated;
grant execute on function public.fn_settle_sales_order_credit(text, text) to service_role;

-- ===== Batalkan COD / Tempo =====
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

  -- Stok dikembalikan satu kali saja.
  if v_order.stock_applied then
    for v_item in
      select product_id, quantity
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
revoke execute on function public.fn_cancel_sales_order_credit(text, text, text) from public, anon, authenticated;
grant execute on function public.fn_cancel_sales_order_credit(text, text, text) to service_role;

-- ===== Hapus pesanan (Owner atau pemegang izin hapus) =====
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

  -- Balikkan stok satu kali bila pesanan masih memotong stok.
  if v_order.stock_applied then
    for v_item in
      select product_id, quantity
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
revoke execute on function public.fn_delete_sales_order_safe(text, text) from public, anon, authenticated;
grant execute on function public.fn_delete_sales_order_safe(text, text) to service_role;

-- ===== Hapus transaksi kasir (Owner) =====
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

  -- Pesanan terkait yang sudah dibatalkan lebih dulu sudah mengembalikan stok.
  select exists (
    select 1 from public.sales_orders
    where transaction_id = p_transaction_id
      and status = 'Dibatalkan'
      and stock_applied = false
  ) into v_order_returned;

  -- Transaksi yang sudah direfund sudah mengembalikan stok, jadi tidak diulang.
  if v_transaction.refunded_at is null and not v_order_returned then
    for v_item in
      select product_id, quantity from public.transaction_items
      where transaction_id = p_transaction_id and product_id is not null
    loop
      insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
      values (v_transaction.branch_id, v_item.product_id, v_item.quantity, 5)
      on conflict (branch_id, product_id) do update
        set quantity = public.stock_levels.quantity + excluded.quantity;
    end loop;
  end if;

  -- Pesanan yang terhubung ikut dihapus agar tidak ikut terhitung lagi.
  for v_order in
    select id from public.sales_orders where transaction_id = p_transaction_id
  loop
    update public.sales_orders set stock_applied = false where id = v_order.id;
    delete from public.sales_orders where id = v_order.id;
  end loop;

  delete from public.transactions where id = p_transaction_id;
end;
$$;
revoke execute on function public.fn_delete_transaction_safe(text, text) from public, anon, authenticated;
grant execute on function public.fn_delete_transaction_safe(text, text) to service_role;

-- ===== RLS pelanggan =====
alter table public.customers enable row level security;

drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers
  for select to authenticated
  using (
    (select private.has_permission('can_use_cashier'))
    or (select private.has_permission('can_create_sales_order'))
    or (select private.has_permission('can_manage_sales_orders'))
    or (select private.has_permission('can_set_customer_tempo'))
  );

grant select on public.customers to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.customers from authenticated;
revoke all on public.customers from anon;
grant select, insert, update, delete on public.customers to service_role;
