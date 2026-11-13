-- Dokumen cetak (Invoice & Surat Jalan).
-- Aditif & idempoten: hanya menambah kolom/tabel/RPC, tidak mengubah alur stok,
-- Buku Kas, bonus, COD/Tempo, pajak, ongkir, kasbon, maupun hak akses lama.

-- ===== Kop dokumen per cabang =====
alter table public.branches
  add column if not exists document_business_name text not null default '';
alter table public.branches
  add column if not exists document_business_address text not null default '';
alter table public.branches
  add column if not exists document_business_phone text not null default '';
alter table public.branches
  add column if not exists document_npwp text not null default '';
alter table public.branches
  add column if not exists document_bank_name text not null default '';
alter table public.branches
  add column if not exists document_bank_account_number text not null default '';
alter table public.branches
  add column if not exists document_bank_account_holder text not null default '';

-- Data awal hanya untuk KPR.1 dan hanya bila belum pernah diisi.
update public.branches set
  document_business_name = 'CV. KARYA PUTRA RAGIL',
  document_business_address = 'Desa Tileng RT 001/RW 001, Kecamatan Dagangan, Kabupaten Madiun, Kode Pos 63172',
  document_business_phone = '085156778896 / 081217366117',
  document_npwp = '0415079508621000',
  document_bank_name = 'BANK BNI',
  document_bank_account_number = '1989116106',
  document_bank_account_holder = 'CV. KARYA PUTRA RAGIL'
where name = 'KPR.1' and document_business_name = '';

-- ===== Data pelanggan untuk kop "Kepada" =====
alter table public.customers
  add column if not exists address text not null default '';
alter table public.customers
  add column if not exists npwp text not null default '';

-- ===== Izin cetak dokumen =====
alter table public.role_permissions
  add column if not exists can_print_documents boolean not null default false;

update public.role_permissions set can_print_documents = true
where can_print_documents = false
  and role in ('Owner', 'Manager', 'Supervisor', 'Cashier', 'Accountant', 'Sales');

update public.role_permissions set can_print_documents = true
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
       when 'can_print_documents'            then can_print_documents
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
      can_print_documents = coalesce((v_permissions ->> 'canPrintDocuments')::boolean, can_print_documents)
    where role = v_role;
  end loop;
end;
$$;
revoke execute on function public.fn_update_role_permissions_matrix(jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_update_role_permissions_matrix(jsonb)
  to service_role;

-- ===== Tabel dokumen cetak =====
create table if not exists public.print_documents (
  id               text primary key,
  doc_type         text not null
                   check (doc_type in ('invoice', 'surat_jalan', 'faktur_pajak')),
  source_type      text not null
                   check (source_type in ('sales_order', 'transaction')),
  source_id        text not null,
  branch_id        text not null references public.branches(id) on delete cascade,
  document_number  text not null,
  doc_date         date not null,
  driver_name      text not null default '',
  vehicle_number   text not null default '',
  note             text not null default '',
  created_by       text references public.employees(id) on delete set null,
  created_by_name  text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (doc_type, source_type, source_id)
);

create index if not exists print_documents_source_idx
  on public.print_documents (source_type, source_id);
create index if not exists print_documents_branch_date_idx
  on public.print_documents (branch_id, doc_date desc);
create index if not exists print_documents_number_idx
  on public.print_documents (document_number);

-- Counter surat jalan (dan faktur pajak nanti). Invoice memakai invoice_counters
-- yang sudah ada agar nomornya tidak bentrok dengan nomor struk kasir.
create table if not exists public.document_counters (
  doc_type       text not null
                 check (doc_type in ('invoice', 'surat_jalan', 'faktur_pajak')),
  day            date not null,
  last_sequence  integer not null default 0,
  primary key (doc_type, day)
);

alter table public.print_documents enable row level security;

drop policy if exists print_documents_read on public.print_documents;
create policy print_documents_read on public.print_documents
  for select to authenticated
  using (
    (select private.has_permission('can_print_documents'))
    and (
      (select private.has_permission('can_view_all_branches'))
      or branch_id = (select branch_id from private.current_employee())
    )
  );

revoke all on public.print_documents from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.print_documents from authenticated;
grant select on public.print_documents to authenticated;
grant select, insert, update, delete on public.print_documents to service_role;
revoke all on public.document_counters from anon, authenticated;
grant select, insert, update, delete on public.document_counters to service_role;

-- ===== JSON dokumen =====
create or replace function public.fn_print_document_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id,
    'docType', d.doc_type,
    'sourceType', d.source_type,
    'sourceId', d.source_id,
    'branchId', d.branch_id,
    'documentNumber', d.document_number,
    'docDate', to_char(d.doc_date, 'YYYY-MM-DD'),
    'driverName', d.driver_name,
    'vehicleNumber', d.vehicle_number,
    'note', d.note,
    'createdById', d.created_by,
    'createdByName', d.created_by_name,
    'createdAt', to_char(d.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(d.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
  from public.print_documents d
  where d.id = p_id;
$$;
revoke execute on function public.fn_print_document_json(text) from public, anon, authenticated;
grant execute on function public.fn_print_document_json(text) to service_role;

-- ===== Ambil / buat nomor dokumen =====
create or replace function public.fn_ensure_print_document(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor record;
  v_doc_type text := lower(trim(coalesce(p_payload ->> 'docType', '')));
  v_source_type text := lower(trim(coalesce(p_payload ->> 'sourceType', '')));
  v_source_id text := nullif(trim(coalesce(p_payload ->> 'sourceId', '')), '');
  v_driver_name text := trim(coalesce(p_payload ->> 'driverName', ''));
  v_vehicle_number text := trim(coalesce(p_payload ->> 'vehicleNumber', ''));
  v_note text := trim(coalesce(p_payload ->> 'note', ''));
  v_order public.sales_orders%rowtype;
  v_transaction public.transactions%rowtype;
  v_doc public.print_documents%rowtype;
  v_day date;
  v_sequence integer;
  v_number text;
  v_prefix text;
  v_branch_id text;
  v_linked_invoice text;
begin
  select e.id, e.name, e.role, e.branch_id,
         rp.can_print_documents, rp.can_view_all_branches
  into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = (p_payload ->> 'actorId')
    and e.is_active = true;

  if v_actor.id is null then
    raise exception 'Sesi pengguna tidak ditemukan';
  end if;
  if coalesce(v_actor.can_print_documents, false) is not true then
    raise exception 'Anda tidak berwenang mencetak dokumen';
  end if;
  if v_source_id is null then
    raise exception 'Dokumen sumber tidak ditemukan';
  end if;
  if v_doc_type not in ('invoice', 'surat_jalan') then
    raise exception 'Jenis dokumen belum tersedia';
  end if;
  if v_source_type not in ('sales_order', 'transaction') then
    raise exception 'Jenis sumber dokumen tidak dikenal';
  end if;
  if v_source_type = 'transaction' and v_doc_type <> 'invoice' then
    raise exception 'Surat jalan hanya dibuat dari pesanan sales';
  end if;

  if v_source_type = 'sales_order' then
    select * into v_order from public.sales_orders where id = v_source_id;
    if not found then raise exception 'Pesanan tidak ditemukan'; end if;

    if v_actor.role = 'Sales' and v_order.sales_employee_id <> v_actor.id then
      raise exception 'Pesanan ini bukan milik Anda';
    end if;
    if coalesce(v_actor.can_view_all_branches, false) is not true
      and v_order.branch_id <> v_actor.branch_id then
      raise exception 'Cabang tidak sesuai akses Anda';
    end if;

    if v_doc_type = 'invoice' and v_order.status = 'Dibatalkan' then
      raise exception 'Pesanan dibatalkan tidak bisa dicetak invoice';
    end if;
    if v_doc_type = 'surat_jalan'
      and v_order.status in ('Menunggu bayar', 'Belum sinkron', 'Dibatalkan') then
      raise exception 'Surat jalan hanya untuk pesanan yang sudah diproses';
    end if;

    v_branch_id := v_order.branch_id;

    if v_doc_type = 'invoice' then
      v_day := (v_order.created_at at time zone 'Asia/Jakarta')::date;

      -- Pesanan yang sudah dilunasi kasir memakai nomor invoice transaksi.
      if v_order.transaction_id is not null then
        select invoice_number, (created_at at time zone 'Asia/Jakarta')::date
        into v_linked_invoice, v_day
        from public.transactions
        where id = v_order.transaction_id;
        v_number := v_linked_invoice;
      end if;
    else
      v_day := (coalesce(v_order.processed_at, v_order.created_at)
                at time zone 'Asia/Jakarta')::date;
    end if;
  else
    select * into v_transaction from public.transactions where id = v_source_id;
    if not found then raise exception 'Transaksi tidak ditemukan'; end if;

    if v_transaction.refunded_at is not null then
      raise exception 'Transaksi yang sudah direfund tidak bisa dicetak invoice';
    end if;
    if coalesce(v_actor.can_view_all_branches, false) is not true
      and v_transaction.branch_id <> v_actor.branch_id then
      raise exception 'Cabang tidak sesuai akses Anda';
    end if;

    v_branch_id := v_transaction.branch_id;
    v_day := (v_transaction.created_at at time zone 'Asia/Jakarta')::date;
    v_number := v_transaction.invoice_number;
  end if;

  -- Kunci per sumber agar dua permintaan bersamaan tidak membuat dokumen ganda.
  perform pg_advisory_xact_lock(
    hashtext('print-document:' || v_doc_type || ':' || v_source_type || ':' || v_source_id)
  );

  select * into v_doc from public.print_documents
  where doc_type = v_doc_type
    and source_type = v_source_type
    and source_id = v_source_id;

  if found then
    -- Hanya surat jalan yang punya isian pengiriman; nomor & tanggal tidak berubah.
    if v_doc_type = 'surat_jalan' then
      update public.print_documents set
        driver_name = case
          when p_payload ? 'driverName' then v_driver_name else driver_name end,
        vehicle_number = case
          when p_payload ? 'vehicleNumber' then v_vehicle_number else vehicle_number end,
        note = case
          when p_payload ? 'note' then v_note else note end,
        updated_at = now()
      where id = v_doc.id
      returning * into v_doc;
    end if;

    return public.fn_print_document_json(v_doc.id);
  end if;

  if v_number is null then
    v_prefix := case v_doc_type
      when 'invoice' then 'INV'
      when 'surat_jalan' then 'SJ'
      else 'FP'
    end;

    if v_doc_type = 'invoice' then
      insert into public.invoice_counters (day, last_sequence)
      values (v_day, 1)
      on conflict (day) do update
        set last_sequence = public.invoice_counters.last_sequence + 1
      returning last_sequence into v_sequence;
    else
      insert into public.document_counters (doc_type, day, last_sequence)
      values (v_doc_type, v_day, 1)
      on conflict (doc_type, day) do update
        set last_sequence = public.document_counters.last_sequence + 1
      returning last_sequence into v_sequence;
    end if;

    v_number := v_prefix || '-' || to_char(v_day, 'YYMMDD') || '-'
      || lpad(v_sequence::text, 3, '0');
  end if;

  insert into public.print_documents (
    id, doc_type, source_type, source_id, branch_id, document_number,
    doc_date, driver_name, vehicle_number, note, created_by, created_by_name
  ) values (
    public.gen_id('doc'), v_doc_type, v_source_type, v_source_id, v_branch_id,
    v_number, v_day,
    case when v_doc_type = 'surat_jalan' then v_driver_name else '' end,
    case when v_doc_type = 'surat_jalan' then v_vehicle_number else '' end,
    case when v_doc_type = 'surat_jalan' then v_note else '' end,
    v_actor.id, v_actor.name
  )
  returning * into v_doc;

  return public.fn_print_document_json(v_doc.id);
end;
$$;
revoke execute on function public.fn_ensure_print_document(jsonb)
  from public, anon, authenticated;
grant execute on function public.fn_ensure_print_document(jsonb) to service_role;

-- ===== Simpan kop dokumen cabang =====
create or replace function public.fn_update_branch_document_profile(
  p_branch_id text,
  p_payload jsonb,
  p_actor_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor record;
begin
  select e.id, e.role, e.branch_id,
         rp.can_manage_settings, rp.can_view_all_branches
  into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = p_actor_id and e.is_active = true;

  if v_actor.id is null then
    raise exception 'Sesi pengguna tidak ditemukan';
  end if;
  if coalesce(v_actor.can_manage_settings, false) is not true then
    raise exception 'Anda tidak punya akses mengubah pengaturan';
  end if;
  if coalesce(v_actor.can_view_all_branches, false) is not true
    and p_branch_id <> v_actor.branch_id then
    raise exception 'Cabang tidak sesuai akses Anda';
  end if;
  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;

  update public.branches set
    document_business_name = trim(coalesce(p_payload ->> 'businessName', '')),
    document_business_address = trim(coalesce(p_payload ->> 'businessAddress', '')),
    document_business_phone = trim(coalesce(p_payload ->> 'businessPhone', '')),
    document_npwp = trim(coalesce(p_payload ->> 'npwp', '')),
    document_bank_name = trim(coalesce(p_payload ->> 'bankName', '')),
    document_bank_account_number = trim(coalesce(p_payload ->> 'bankAccountNumber', '')),
    document_bank_account_holder = trim(coalesce(p_payload ->> 'bankAccountHolder', ''))
  where id = p_branch_id;
end;
$$;
revoke execute on function public.fn_update_branch_document_profile(text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.fn_update_branch_document_profile(text, jsonb, text)
  to service_role;

-- ===== Simpan pelanggan + alamat/NPWP =====
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
  v_address text := trim(coalesce(p_payload ->> 'address', ''));
  v_npwp text := trim(coalesce(p_payload ->> 'npwp', ''));
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
    insert into public.customers (
      id, name, phone, address, npwp, allow_tempo, branch_id
    ) values (
      v_id, v_name, v_phone, v_address, v_npwp, v_allow_tempo,
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
      address = v_address,
      npwp = v_npwp,
      allow_tempo = v_allow_tempo,
      updated_at = now()
    where id = v_id;

    -- Nama pada pesanan lama ikut diselaraskan agar riwayat tetap konsisten.
    update public.sales_orders set
      customer_name = v_name,
      customer_phone = v_phone
    where customer_id = v_id;
  end if;

  select id, name, phone, address, npwp, allow_tempo, is_active, branch_id
  into v_customer
  from public.customers where id = v_id;

  return jsonb_build_object(
    'id', v_customer.id,
    'name', v_customer.name,
    'phone', v_customer.phone,
    'address', v_customer.address,
    'npwp', v_customer.npwp,
    'allowTempo', v_customer.allow_tempo,
    'isActive', v_customer.is_active,
    'branchId', v_customer.branch_id
  );
end;
$$;
revoke execute on function public.fn_save_customer(jsonb) from public, anon, authenticated;
grant execute on function public.fn_save_customer(jsonb) to service_role;
