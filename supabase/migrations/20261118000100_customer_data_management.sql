-- Kelola data pelanggan: izin baru, nonaktifkan, hapus aman, dan gabungkan
-- pelanggan ganda. Aditif & idempoten: tidak mengubah alur stok, penjualan,
-- Buku Kas, kasbon, COD/Tempo, pajak, ongkir, bonus, dokumen, maupun hak akses
-- lain. Semua RPC hanya untuk service_role dan memvalidasi izin aktor.

-- ===== Izin baru =====
alter table public.role_permissions
  add column if not exists can_manage_customer_data boolean not null default false;

update public.role_permissions
set can_manage_customer_data = true
where role = 'Owner' and can_manage_customer_data = false;

update public.role_permissions
set can_manage_customer_data = true
where role = 'Manager' and can_manage_customer_data = false;

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
       when 'can_print_documents'            then can_print_documents
       when 'can_manage_customer_data'       then can_manage_customer_data
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
      can_delete_transaction = coalesce((v_permissions ->> 'canDeleteTransaction')::boolean, can_delete_transaction),
      can_print_documents = coalesce((v_permissions ->> 'canPrintDocuments')::boolean, can_print_documents),
      can_manage_customer_data = coalesce((v_permissions ->> 'canManageCustomerData')::boolean, can_manage_customer_data)
    where role = v_role;
  end loop;
end;
$$;
revoke execute on function public.fn_update_role_permissions_matrix(jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_update_role_permissions_matrix(jsonb)
  to service_role;

-- ===== Validasi aktor =====
create or replace function private.can_manage_customer_data(p_actor_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.employees e
    join public.role_permissions rp on rp.role = e.role
    where e.id = p_actor_id
      and e.is_active = true
      and rp.can_manage_customer_data = true
  );
$$;
revoke execute on function private.can_manage_customer_data(text)
  from public, anon, authenticated;
grant execute on function private.can_manage_customer_data(text) to service_role;

-- ===== Nonaktifkan / aktifkan pelanggan =====
create or replace function public.fn_set_customer_active(
  p_id text,
  p_is_active boolean,
  p_actor_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer public.customers%rowtype;
begin
  if not private.can_manage_customer_data(p_actor_id) then
    raise exception 'Anda tidak berwenang mengelola data pelanggan';
  end if;

  select * into v_customer
  from public.customers
  where id = p_id
  for update;

  if not found then
    return jsonb_build_object(
      'id', p_id,
      'name', '',
      'isActive', p_is_active,
      'alreadyApplied', true
    );
  end if;

  update public.customers
  set is_active = p_is_active, updated_at = now()
  where id = p_id;

  return jsonb_build_object(
    'id', v_customer.id,
    'name', v_customer.name,
    'isActive', p_is_active,
    'alreadyApplied', v_customer.is_active = p_is_active
  );
end;
$$;
revoke execute on function public.fn_set_customer_active(text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.fn_set_customer_active(text, boolean, text)
  to service_role;

-- ===== Hapus pelanggan tanpa riwayat =====
create or replace function public.fn_delete_customer(
  p_id text,
  p_actor_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer public.customers%rowtype;
  v_history_count integer;
begin
  if not private.can_manage_customer_data(p_actor_id) then
    raise exception 'Anda tidak berwenang mengelola data pelanggan';
  end if;

  select * into v_customer
  from public.customers
  where id = p_id
  for update;

  if not found then
    return jsonb_build_object(
      'id', p_id,
      'name', '',
      'historyCount', 0,
      'alreadyDeleted', true
    );
  end if;

  -- Pesanan lama bisa belum punya customer_id; namanya tetap dianggap riwayat.
  select count(*) into v_history_count
  from public.sales_orders o
  where o.customer_id = v_customer.id
     or (
       o.customer_id is null
       and lower(trim(o.customer_name)) = lower(trim(v_customer.name))
     );

  if v_history_count > 0 then
    raise exception 'Pelanggan % masih punya % pesanan/transaksi. Gabungkan atau nonaktifkan saja.',
      v_customer.name, v_history_count;
  end if;

  delete from public.customers where id = v_customer.id;

  return jsonb_build_object(
    'id', v_customer.id,
    'name', v_customer.name,
    'historyCount', 0,
    'alreadyDeleted', false
  );
end;
$$;
revoke execute on function public.fn_delete_customer(text, text)
  from public, anon, authenticated;
grant execute on function public.fn_delete_customer(text, text)
  to service_role;

-- ===== Gabungkan pelanggan ganda =====
create or replace function public.fn_merge_customers(
  p_source_id text,
  p_target_id text,
  p_actor_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.customers%rowtype;
  v_target public.customers%rowtype;
  v_moved_orders integer := 0;
  v_source_tempo integer := 0;
  v_target_tempo integer := 0;
begin
  if not private.can_manage_customer_data(p_actor_id) then
    raise exception 'Anda tidak berwenang mengelola data pelanggan';
  end if;

  if p_source_id = p_target_id then
    raise exception 'Pilih pelanggan target yang berbeda';
  end if;

  -- Kunci dua baris dengan urutan id yang sama agar aman dari deadlock.
  if p_source_id < p_target_id then
    select * into v_source from public.customers where id = p_source_id for update;
    select * into v_target from public.customers where id = p_target_id for update;
  else
    select * into v_target from public.customers where id = p_target_id for update;
    select * into v_source from public.customers where id = p_source_id for update;
  end if;

  if v_source.id is null then
    if v_target.id is not null then
      return jsonb_build_object(
        'sourceName', '',
        'targetName', v_target.name,
        'movedOrders', 0,
        'movedActiveTempo', 0,
        'alreadyMerged', true
      );
    end if;
    raise exception 'Pelanggan sumber tidak ditemukan';
  end if;

  if v_target.id is null then
    raise exception 'Pelanggan target tidak ditemukan';
  end if;

  if not v_target.is_active then
    raise exception 'Pelanggan target sudah nonaktif. Aktifkan dulu sebelum menggabungkan.';
  end if;

  select count(*) into v_source_tempo
  from public.sales_orders
  where customer_id = v_source.id
    and payment_scheme = 'tempo'
    and status = 'Tempo - menunggu pembayaran';

  select count(*) into v_target_tempo
  from public.sales_orders
  where customer_id = v_target.id
    and payment_scheme = 'tempo'
    and status = 'Tempo - menunggu pembayaran';

  if v_source_tempo > 0 and v_target_tempo > 0 then
    raise exception 'Gabungan ditolak: kedua pelanggan punya tempo aktif. Lunasi atau batalkan salah satu tempo dulu.';
  end if;

  -- Pindahkan semua pesanan, termasuk pesanan lama yang hanya tercatat namanya.
  update public.sales_orders set
    customer_id = v_target.id,
    customer_name = v_target.name,
    customer_phone = v_target.phone
  where customer_id = v_source.id
     or (
       customer_id is null
       and lower(trim(customer_name)) = lower(trim(v_source.name))
     );
  get diagnostics v_moved_orders = row_count;

  if exists (
    select 1 from public.sales_orders where customer_id = v_source.id
  ) then
    raise exception 'Gagal memindahkan seluruh riwayat pelanggan';
  end if;

  delete from public.customers where id = v_source.id;

  return jsonb_build_object(
    'sourceName', v_source.name,
    'targetName', v_target.name,
    'movedOrders', v_moved_orders,
    'movedActiveTempo', v_source_tempo,
    'alreadyMerged', false
  );
end;
$$;
revoke execute on function public.fn_merge_customers(text, text, text)
  from public, anon, authenticated;
grant execute on function public.fn_merge_customers(text, text, text)
  to service_role;
