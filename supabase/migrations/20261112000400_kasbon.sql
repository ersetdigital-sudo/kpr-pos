-- Kasbon karyawan: pengajuan, persetujuan berurutan (Accounting → Manager →
-- Owner), pelunasan, dan integrasi otomatis ke Buku Kas.
-- Aditif & idempoten; aman dijalankan berulang. Semua tulis lewat RPC
-- security definer yang dipanggil server action dengan service_role.

-- ===== Jin tabel =====
create table if not exists public.kasbon (
  id                text primary key,
  employee_id       text not null references public.employees(id) on delete cascade,
  branch_id         text not null references public.branches(id) on delete cascade,
  amount            integer not null check (amount > 0),
  reason            text not null,
  repayment_method  text not null check (repayment_method in ('potong_gaji', 'tempo')),
  tempo_value       integer check (tempo_value is null or tempo_value > 0),
  tempo_unit        text check (tempo_unit is null or tempo_unit in ('hari', 'minggu')),
  due_date          date,
  status            text not null default 'Menunggu Accounting'
                    check (status in (
                      'Menunggu Accounting', 'Menunggu Manager', 'Menunggu Owner',
                      'Disetujui', 'Ditolak', 'Lunas'
                    )),
  rejection_reason  text not null default '',
  approved_at       timestamptz,
  settled_at        timestamptz,
  settled_by        text references public.employees(id) on delete set null,
  settled_by_name   text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.kasbon_approvals (
  id               text primary key,
  kasbon_id        text not null references public.kasbon(id) on delete cascade,
  stage            text not null check (stage in ('Accounting', 'Manager', 'Owner')),
  decision         text not null check (decision in ('Disetujui', 'Ditolak')),
  note             text not null default '',
  decided_by       text references public.employees(id) on delete set null,
  decided_by_name  text not null default '',
  decided_at       timestamptz not null default now(),
  unique (kasbon_id, stage)
);

create index if not exists kasbon_employee_idx on public.kasbon (employee_id);
create index if not exists kasbon_branch_idx on public.kasbon (branch_id);
create index if not exists kasbon_status_created_idx
  on public.kasbon (status, created_at desc);
create index if not exists kasbon_approvals_kasbon_idx
  on public.kasbon_approvals (kasbon_id);

-- Satu karyawan hanya boleh punya satu kasbon yang belum selesai.
create unique index if not exists kasbon_one_active_per_employee
  on public.kasbon (employee_id)
  where status not in ('Lunas', 'Ditolak');

-- ===== Izin role =====
alter table public.role_permissions
  add column if not exists can_access_kasbon boolean not null default true;
alter table public.role_permissions
  add column if not exists can_approve_kasbon_accounting boolean not null default false;
alter table public.role_permissions
  add column if not exists can_approve_kasbon_manager boolean not null default false;
alter table public.role_permissions
  add column if not exists can_approve_kasbon_owner boolean not null default false;
alter table public.role_permissions
  add column if not exists can_settle_kasbon boolean not null default false;
alter table public.role_permissions
  add column if not exists can_view_all_kasbon boolean not null default false;

-- Semua role boleh membuka halaman Kasbon dan mengajukan.
update public.role_permissions set can_access_kasbon = true
where can_access_kasbon = false;

update public.role_permissions set can_approve_kasbon_accounting = true
where role = 'Accountant';
update public.role_permissions set can_approve_kasbon_manager = true
where role = 'Manager';
update public.role_permissions set can_approve_kasbon_owner = true
where role = 'Owner';
update public.role_permissions set can_settle_kasbon = true
where role in ('Accountant', 'Owner');
update public.role_permissions set can_view_all_kasbon = true
where role in ('Accountant', 'Manager', 'Owner');

-- Owner selalu memegang seluruh akses.
update public.role_permissions set
  can_access_kasbon = true,
  can_approve_kasbon_accounting = true,
  can_approve_kasbon_manager = true,
  can_approve_kasbon_owner = true,
  can_settle_kasbon = true,
  can_view_all_kasbon = true
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
      can_view_all_kasbon = coalesce((v_permissions ->> 'canViewAllKasbon')::boolean, can_view_all_kasbon)
    where role = v_role;
  end loop;
end;
$$;
revoke execute on function public.fn_update_role_permissions_matrix(jsonb) from public, anon, authenticated;
grant execute on function public.fn_update_role_permissions_matrix(jsonb) to service_role;

-- ===== Buku Kas: entri otomatis =====
alter table public.cash_book_entries
  add column if not exists is_automatic boolean not null default false;
alter table public.cash_book_entries
  add column if not exists source_type text;
alter table public.cash_book_entries
  add column if not exists source_id text;

-- Tautan sumber: satu sumber hanya boleh menghasilkan satu entri per jenis.
create unique index if not exists cash_book_entries_source_unique
  on public.cash_book_entries (source_type, source_id, type);
create index if not exists cash_book_entries_source_idx
  on public.cash_book_entries (source_id);

insert into public.cash_book_categories (id, type, name) values
  ('cbc-out-kasbon-karyawan', 'keluar', 'Kasbon karyawan'),
  ('cbc-in-pelunasan-kasbon', 'masuk', 'Pelunasan kasbon')
on conflict do nothing;

-- Entri otomatis tidak boleh diubah atau dihapus manual.
create or replace function public.fn_save_cash_book_entry(p_payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor record;
  v_id text := nullif(trim(coalesce(p_payload ->> 'id', '')), '');
  v_branch_id text := nullif(trim(coalesce(p_payload ->> 'branchId', '')), '');
  v_type text := trim(coalesce(p_payload ->> 'type', ''));
  v_category_id text := nullif(trim(coalesce(p_payload ->> 'categoryId', '')), '');
  v_amount integer := coalesce((p_payload ->> 'amount')::integer, 0);
  v_description text := trim(coalesce(p_payload ->> 'description', ''));
  v_entry_date date := coalesce(nullif(trim(coalesce(p_payload ->> 'entryDate', '')), '')::date, current_date);
  v_category record;
begin
  select e.id, e.role, e.branch_id, e.name into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = (p_payload ->> 'actorId')
    and e.is_active = true
    and rp.can_access_cash_book = true;

  if v_actor.id is null then
    raise exception 'Anda tidak punya akses buku kas';
  end if;

  if v_type not in ('masuk', 'keluar') then
    raise exception 'Jenis entri kas tidak dikenal';
  end if;

  if v_branch_id is null or not exists (
    select 1 from public.branches where id = v_branch_id
  ) then
    raise exception 'Cabang entri kas tidak ditemukan';
  end if;

  if v_actor.role <> 'Owner' and v_branch_id <> v_actor.branch_id then
    raise exception 'Cabang tidak sesuai akses Anda';
  end if;

  if v_amount <= 0 then
    raise exception 'Nominal harus lebih dari 0';
  end if;

  if length(v_description) < 3 then
    raise exception 'Keterangan minimal 3 karakter';
  end if;

  select id, type, is_active into v_category
  from public.cash_book_categories
  where id = v_category_id;

  if v_category.id is null then
    raise exception 'Kategori tidak ditemukan';
  end if;
  if v_category.is_active = false then
    raise exception 'Kategori sudah nonaktif';
  end if;
  if v_category.type <> v_type then
    raise exception 'Kategori tidak sesuai jenis entri';
  end if;

  if v_id is null then
    v_id := public.gen_id('cbe');
    insert into public.cash_book_entries (
      id, branch_id, type, category_id, amount, description,
      entry_date, created_by, created_by_name
    ) values (
      v_id, v_branch_id, v_type, v_category_id, v_amount,
      v_description, v_entry_date, v_actor.id, v_actor.name
    );
    return v_id;
  end if;

  if not exists (select 1 from public.cash_book_entries where id = v_id) then
    raise exception 'Entri kas tidak ditemukan';
  end if;

  if exists (
    select 1 from public.cash_book_entries
    where id = v_id and is_automatic = true
  ) then
    raise exception 'Entri otomatis tidak bisa diubah manual';
  end if;

  if v_actor.role <> 'Owner' and exists (
    select 1 from public.cash_book_entries
    where id = v_id and branch_id <> v_actor.branch_id
  ) then
    raise exception 'Cabang tidak sesuai akses Anda';
  end if;

  update public.cash_book_entries set
    branch_id = v_branch_id,
    type = v_type,
    category_id = v_category_id,
    amount = v_amount,
    description = v_description,
    entry_date = v_entry_date,
    updated_at = now()
  where id = v_id;

  return v_id;
end;
$$;
revoke execute on function public.fn_save_cash_book_entry(jsonb) from public, anon, authenticated;
grant execute on function public.fn_save_cash_book_entry(jsonb) to service_role;

create or replace function public.fn_delete_cash_book_entry(
  p_id text,
  p_actor_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor record;
  v_entry record;
begin
  select e.id, e.role, e.branch_id into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = p_actor_id
    and e.is_active = true
    and rp.can_access_cash_book = true;

  if v_actor.id is null then
    raise exception 'Anda tidak punya akses buku kas';
  end if;

  select id, branch_id, is_automatic into v_entry
  from public.cash_book_entries
  where id = p_id;

  if v_entry.id is null then
    raise exception 'Entri kas tidak ditemukan';
  end if;

  if v_entry.is_automatic = true then
    raise exception 'Entri otomatis tidak bisa dihapus manual';
  end if;

  if v_actor.role <> 'Owner' and v_entry.branch_id <> v_actor.branch_id then
    raise exception 'Cabang tidak sesuai akses Anda';
  end if;

  delete from public.cash_book_entries where id = p_id;
end;
$$;
revoke execute on function public.fn_delete_cash_book_entry(text, text) from public, anon, authenticated;
grant execute on function public.fn_delete_cash_book_entry(text, text) to service_role;

-- ===== JSON kasbon =====
create or replace function public.fn_kasbon_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', k.id,
    'employeeId', k.employee_id,
    'branchId', k.branch_id,
    'amount', k.amount,
    'reason', k.reason,
    'repaymentMethod', k.repayment_method,
    'tempoValue', k.tempo_value,
    'tempoUnit', k.tempo_unit,
    'dueDate', case when k.due_date is null then null else to_char(k.due_date, 'YYYY-MM-DD') end,
    'status', k.status,
    'rejectionReason', k.rejection_reason,
    'approvedAt', case
      when k.approved_at is null then null
      else to_char(k.approved_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    end,
    'settledAt', case
      when k.settled_at is null then null
      else to_char(k.settled_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    end,
    'settledById', k.settled_by,
    'settledByName', k.settled_by_name,
    'createdAt', to_char(k.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(k.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'approvals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'stage', a.stage,
        'decision', a.decision,
        'note', a.note,
        'decidedById', a.decided_by,
        'decidedByName', a.decided_by_name,
        'decidedAt', to_char(a.decided_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      ) order by a.decided_at)
      from public.kasbon_approvals a
      where a.kasbon_id = k.id
    ), '[]'::jsonb)
  )
  from public.kasbon k
  where k.id = p_id;
$$;
revoke execute on function public.fn_kasbon_json(text) from public, anon, authenticated;
grant execute on function public.fn_kasbon_json(text) to service_role;

-- ===== Ajukan kasbon =====
create or replace function public.fn_submit_kasbon(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_employee public.employees%rowtype;
  v_allowed boolean;
  v_id text := public.gen_id('ksb');
  v_amount integer := coalesce((p_payload ->> 'amount')::integer, 0);
  v_reason text := trim(coalesce(p_payload ->> 'reason', ''));
  v_method text := trim(coalesce(p_payload ->> 'repaymentMethod', ''));
  v_tempo_value integer := nullif(p_payload ->> 'tempoValue', '')::integer;
  v_tempo_unit text := nullif(trim(coalesce(p_payload ->> 'tempoUnit', '')), '');
begin
  select * into v_employee from public.employees
  where id = (p_payload ->> 'employeeId') and is_active = true;

  if not found then raise exception 'Karyawan aktif tidak ditemukan'; end if;

  select can_access_kasbon into v_allowed
  from public.role_permissions where role = v_employee.role;

  if not coalesce(v_allowed, false) then
    raise exception 'Role ini tidak punya akses kasbon';
  end if;

  if v_amount <= 0 then raise exception 'Nominal kasbon harus lebih dari 0'; end if;
  if length(v_reason) < 3 then raise exception 'Alasan minimal 3 karakter'; end if;
  if v_method not in ('potong_gaji', 'tempo') then
    raise exception 'Metode pelunasan tidak valid';
  end if;

  if v_method = 'tempo' then
    if v_tempo_value is null or v_tempo_value <= 0 then
      raise exception 'Jumlah tempo harus lebih dari 0';
    end if;
    if v_tempo_unit not in ('hari', 'minggu') then
      raise exception 'Satuan tempo harus hari atau minggu';
    end if;
  else
    v_tempo_value := null;
    v_tempo_unit := null;
  end if;

  if exists (
    select 1 from public.kasbon
    where employee_id = v_employee.id
      and status not in ('Lunas', 'Ditolak')
  ) then
    raise exception 'Masih ada kasbon aktif. Tunggu keputusan atau selesaikan kasbon sebelumnya.';
  end if;

  insert into public.kasbon (
    id, employee_id, branch_id, amount, reason, repayment_method,
    tempo_value, tempo_unit, status
  ) values (
    v_id, v_employee.id, v_employee.branch_id, v_amount, v_reason, v_method,
    v_tempo_value, v_tempo_unit, 'Menunggu Accounting'
  );

  return public.fn_kasbon_json(v_id);
end;
$$;
revoke execute on function public.fn_submit_kasbon(jsonb) from public, anon, authenticated;
grant execute on function public.fn_submit_kasbon(jsonb) to service_role;

-- ===== Persetujuan per tahap =====
create or replace function public.fn_review_kasbon(
  p_kasbon_id text,
  p_stage text,
  p_decision text,
  p_actor_id text,
  p_note text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_kasbon public.kasbon%rowtype;
  v_actor public.employees%rowtype;
  v_allowed boolean;
  v_note text := trim(coalesce(p_note, ''));
  v_next text;
  v_due date;
  v_employee_name text;
begin
  if p_stage not in ('Accounting', 'Manager', 'Owner') then
    raise exception 'Tahap persetujuan tidak dikenal';
  end if;
  if p_decision not in ('Disetujui', 'Ditolak') then
    raise exception 'Keputusan persetujuan tidak dikenal';
  end if;

  select * into v_actor from public.employees
  where id = p_actor_id and is_active = true;

  if not found then raise exception 'Sesi pengguna tidak ditemukan'; end if;

  select case p_stage
           when 'Accounting' then can_approve_kasbon_accounting
           when 'Manager' then can_approve_kasbon_manager
           else can_approve_kasbon_owner
         end
  into v_allowed
  from public.role_permissions where role = v_actor.role;

  if not coalesce(v_allowed, false) then
    raise exception 'Anda tidak berwenang menyetujui tahap %', p_stage;
  end if;

  select * into v_kasbon from public.kasbon
  where id = p_kasbon_id for update;

  if not found then raise exception 'Kasbon tidak ditemukan'; end if;

  if v_kasbon.employee_id = v_actor.id then
    raise exception 'Pemohon tidak bisa menyetujui kasbonnya sendiri';
  end if;

  if (p_stage = 'Accounting' and v_kasbon.status <> 'Menunggu Accounting')
    or (p_stage = 'Manager' and v_kasbon.status <> 'Menunggu Manager')
    or (p_stage = 'Owner' and v_kasbon.status <> 'Menunggu Owner') then
    raise exception 'Kasbon ini tidak sedang menunggu persetujuan %', p_stage;
  end if;

  if exists (
    select 1 from public.kasbon_approvals
    where kasbon_id = p_kasbon_id and stage = p_stage
  ) then
    raise exception 'Tahap % sudah diproses', p_stage;
  end if;

  if p_decision = 'Ditolak' and length(v_note) < 3 then
    raise exception 'Alasan penolakan wajib diisi minimal 3 karakter';
  end if;

  insert into public.kasbon_approvals (
    id, kasbon_id, stage, decision, note, decided_by, decided_by_name, decided_at
  ) values (
    public.gen_id('ksba'), p_kasbon_id, p_stage, p_decision, v_note,
    v_actor.id, v_actor.name, now()
  );

  if p_decision = 'Ditolak' then
    update public.kasbon set
      status = 'Ditolak',
      rejection_reason = v_note,
      updated_at = now()
    where id = p_kasbon_id;

    return public.fn_kasbon_json(p_kasbon_id);
  end if;

  if p_stage = 'Accounting' then
    v_next := 'Menunggu Manager';
  elsif p_stage = 'Manager' then
    v_next := 'Menunggu Owner';
  else
    v_next := 'Disetujui';
  end if;

  if v_next = 'Disetujui' then
    -- Jatuh tempo tempo dihitung dari tanggal persetujuan Owner.
    if v_kasbon.repayment_method = 'tempo' then
      v_due := (now() at time zone 'Asia/Jakarta')::date
        + (v_kasbon.tempo_value
           * case v_kasbon.tempo_unit when 'minggu' then 7 else 1 end);
    else
      v_due := null;
    end if;

    update public.kasbon set
      status = 'Disetujui',
      approved_at = now(),
      due_date = v_due,
      updated_at = now()
    where id = p_kasbon_id;

    select name into v_employee_name
    from public.employees where id = v_kasbon.employee_id;

    -- Pengeluaran otomatis ke Buku Kas cabang kasbon; tautan sumber mencegah dobel.
    insert into public.cash_book_entries (
      id, branch_id, type, category_id, amount, description, entry_date,
      created_by, created_by_name, is_automatic, source_type, source_id
    ) values (
      public.gen_id('cbe'), v_kasbon.branch_id, 'keluar', 'cbc-out-kasbon-karyawan',
      v_kasbon.amount,
      'Kasbon ' || coalesce(v_employee_name, 'karyawan'),
      (now() at time zone 'Asia/Jakarta')::date,
      v_actor.id, v_actor.name, true, 'kasbon', v_kasbon.id
    )
    on conflict (source_type, source_id, type) do nothing;
  else
    update public.kasbon set
      status = v_next,
      updated_at = now()
    where id = p_kasbon_id;
  end if;

  return public.fn_kasbon_json(p_kasbon_id);
end;
$$;
revoke execute on function public.fn_review_kasbon(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_review_kasbon(text, text, text, text, text) to service_role;

-- ===== Tandai lunas =====
create or replace function public.fn_settle_kasbon(
  p_kasbon_id text,
  p_actor_id text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_kasbon public.kasbon%rowtype;
  v_actor public.employees%rowtype;
  v_allowed boolean;
  v_employee_name text;
begin
  select * into v_actor from public.employees
  where id = p_actor_id and is_active = true;

  if not found then raise exception 'Sesi pengguna tidak ditemukan'; end if;

  select can_settle_kasbon into v_allowed
  from public.role_permissions where role = v_actor.role;

  if not coalesce(v_allowed, false) then
    raise exception 'Anda tidak berwenang menandai kasbon lunas';
  end if;

  select * into v_kasbon from public.kasbon
  where id = p_kasbon_id for update;

  if not found then raise exception 'Kasbon tidak ditemukan'; end if;
  -- Idempotent: menandai lunas dua kali tidak menggandakan Buku Kas.
  if v_kasbon.status = 'Lunas' then
    return public.fn_kasbon_json(p_kasbon_id);
  end if;
  if v_kasbon.status <> 'Disetujui' then
    raise exception 'Hanya kasbon berstatus Disetujui yang bisa ditandai lunas';
  end if;

  update public.kasbon set
    status = 'Lunas',
    settled_at = now(),
    settled_by = v_actor.id,
    settled_by_name = v_actor.name,
    updated_at = now()
  where id = p_kasbon_id;

  -- Metode tempo: pelunasan dicatat sebagai pemasukan Buku Kas.
  if v_kasbon.repayment_method = 'tempo' then
    select name into v_employee_name
    from public.employees where id = v_kasbon.employee_id;

    insert into public.cash_book_entries (
      id, branch_id, type, category_id, amount, description, entry_date,
      created_by, created_by_name, is_automatic, source_type, source_id
    ) values (
      public.gen_id('cbe'), v_kasbon.branch_id, 'masuk', 'cbc-in-pelunasan-kasbon',
      v_kasbon.amount,
      'Pelunasan kasbon ' || coalesce(v_employee_name, 'karyawan'),
      (now() at time zone 'Asia/Jakarta')::date,
      v_actor.id, v_actor.name, true, 'kasbon', v_kasbon.id
    )
    on conflict (source_type, source_id, type) do nothing;
  end if;

  return public.fn_kasbon_json(p_kasbon_id);
end;
$$;
revoke execute on function public.fn_settle_kasbon(text, text) from public, anon, authenticated;
grant execute on function public.fn_settle_kasbon(text, text) to service_role;

-- ===== RLS =====
alter table public.kasbon enable row level security;
alter table public.kasbon_approvals enable row level security;

drop policy if exists kasbon_read on public.kasbon;
create policy kasbon_read on public.kasbon
  for select to authenticated
  using (
    (select private.has_permission('can_access_kasbon'))
    and (
      (select private.has_permission('can_view_all_kasbon'))
      or (select private.has_permission('can_approve_kasbon_accounting'))
      or (select private.has_permission('can_approve_kasbon_manager'))
      or (select private.has_permission('can_approve_kasbon_owner'))
      or (select private.has_permission('can_settle_kasbon'))
      or employee_id = (select id from private.current_employee())
    )
  );

drop policy if exists kasbon_approvals_read on public.kasbon_approvals;
create policy kasbon_approvals_read on public.kasbon_approvals
  for select to authenticated
  using (
    exists (select 1 from public.kasbon k where k.id = kasbon_id)
  );

-- ===== Privilege =====
grant usage on schema public to service_role;
grant select, insert, update, delete on public.kasbon to service_role;
grant select, insert, update, delete on public.kasbon_approvals to service_role;
grant execute on function public.gen_id(text) to service_role;

revoke all on public.kasbon from anon;
revoke all on public.kasbon_approvals from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.kasbon from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.kasbon_approvals from authenticated;
grant select on public.kasbon to authenticated;
grant select on public.kasbon_approvals to authenticated;
