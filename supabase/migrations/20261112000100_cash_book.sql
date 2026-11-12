-- Buku Kas: kategori dan entri kas manual per cabang.
-- Pemasukan dari penjualan tidak disimpan di tabel ini; nilainya dihitung saat
-- membaca (transaksi kasir + pesanan Lunas) agar tidak ada angka ganda.

create table if not exists public.cash_book_categories (
  id         text primary key,
  type       text not null check (type in ('masuk', 'keluar')),
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, name)
);

create table if not exists public.cash_book_entries (
  id              text primary key,
  branch_id       text not null references public.branches(id) on delete cascade,
  type            text not null check (type in ('masuk', 'keluar')),
  category_id     text not null references public.cash_book_categories(id),
  amount          integer not null check (amount > 0),
  description     text not null default '',
  entry_date      date not null,
  created_by      text references public.employees(id) on delete set null,
  created_by_name text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists cash_book_entries_branch_date_idx
  on public.cash_book_entries (branch_id, entry_date desc);
create index if not exists cash_book_entries_date_idx
  on public.cash_book_entries (entry_date desc);
create index if not exists cash_book_entries_category_idx
  on public.cash_book_entries (category_id);
create index if not exists cash_book_entries_created_by_idx
  on public.cash_book_entries (created_by);

-- Izin akses Buku Kas; default hanya Owner.
alter table public.role_permissions
  add column if not exists can_access_cash_book boolean not null default false;

update public.role_permissions set can_access_cash_book = true where role = 'Owner';

-- Helper izin RLS perlu mengenal kolom baru.
create or replace function private.has_permission(permission text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select case permission
       when 'can_apply_discount'      then can_apply_discount
       when 'can_cancel_transaction'  then can_cancel_transaction
       when 'can_manage_products'     then can_manage_products
       when 'can_create_sales_order'  then can_create_sales_order
       when 'can_manage_sales_orders' then can_manage_sales_orders
       when 'can_export_reports'      then can_export_reports
       when 'can_view_all_branches'   then can_view_all_branches
       when 'can_view_all_attendance' then can_view_all_attendance
       when 'can_approve_leave'       then can_approve_leave
       when 'can_manage_employees'    then can_manage_employees
       when 'can_manage_branches'     then can_manage_branches
       when 'can_manage_settings'     then can_manage_settings
       when 'can_access_cash_book'    then can_access_cash_book
       else false end
     from public.role_permissions
     where role = (select private.current_role())),
    false);
$$;
revoke execute on function private.has_permission(text) from public, anon;
grant execute on function private.has_permission(text) to authenticated;

-- Matriks hak akses ikut menyimpan izin baru.
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
      can_view_products = coalesce((v_permissions ->> 'canViewProducts')::boolean, can_view_products)
    where role = v_role;
  end loop;
end;
$$;
revoke execute on function public.fn_update_role_permissions_matrix(jsonb) from public, anon, authenticated;
grant execute on function public.fn_update_role_permissions_matrix(jsonb) to service_role;

-- Kategori awal.
insert into public.cash_book_categories (id, type, name) values
  ('cbc-in-tambahan-modal', 'masuk', 'Tambahan modal'),
  ('cbc-in-pemasukan-lain', 'masuk', 'Pemasukan lain'),
  ('cbc-in-saldo-awal', 'masuk', 'Saldo awal'),
  ('cbc-out-pembelian-barang', 'keluar', 'Pembelian barang'),
  ('cbc-out-gaji', 'keluar', 'Gaji'),
  ('cbc-out-listrik-air-internet', 'keluar', 'Listrik/air/internet'),
  ('cbc-out-sewa', 'keluar', 'Sewa'),
  ('cbc-out-transport', 'keluar', 'Transport'),
  ('cbc-out-operasional-lain', 'keluar', 'Operasional lain')
on conflict do nothing;

-- RLS: baca hanya untuk pemegang izin; cabang sendiri kecuali Owner.
alter table public.cash_book_categories enable row level security;
alter table public.cash_book_entries enable row level security;

drop policy if exists cash_book_categories_read on public.cash_book_categories;
create policy cash_book_categories_read on public.cash_book_categories
  for select to authenticated
  using ((select private.has_permission('can_access_cash_book')));

drop policy if exists cash_book_entries_read on public.cash_book_entries;
create policy cash_book_entries_read on public.cash_book_entries
  for select to authenticated
  using (
    (select private.has_permission('can_access_cash_book'))
    and (
      (select private.current_role()) = 'Owner'
      or branch_id = (select private.current_branch())
    )
  );

-- Saldo awal: seluruh kas sebelum periode (entri manual + penjualan).
create or replace function public.fn_cash_book_opening_balance(
  p_start_date date,
  p_start_at timestamptz,
  p_branch_id text
)
returns bigint
language sql stable security definer set search_path = ''
as $$
  select
    coalesce((
      select sum(amount) from public.cash_book_entries
      where type = 'masuk' and entry_date < p_start_date
        and (p_branch_id is null or branch_id = p_branch_id)
    ), 0)
    - coalesce((
      select sum(amount) from public.cash_book_entries
      where type = 'keluar' and entry_date < p_start_date
        and (p_branch_id is null or branch_id = p_branch_id)
    ), 0)
    + coalesce((
      select sum(total) from public.transactions
      where refunded_at is null and created_at < p_start_at
        and (p_branch_id is null or branch_id = p_branch_id)
    ), 0)
    + coalesce((
      select sum(total) from public.sales_orders
      where status = 'Lunas' and coalesce(paid_at, created_at) < p_start_at
        and (p_branch_id is null or branch_id = p_branch_id)
    ), 0);
$$;
revoke execute on function public.fn_cash_book_opening_balance(date, timestamptz, text) from public, anon, authenticated;
grant execute on function public.fn_cash_book_opening_balance(date, timestamptz, text) to service_role;

-- Simpan (buat/ubah) entri kas manual.
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

-- Hapus entri kas manual.
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

  if not exists (select 1 from public.cash_book_entries where id = p_id) then
    raise exception 'Entri kas tidak ditemukan';
  end if;

  if v_actor.role <> 'Owner' and exists (
    select 1 from public.cash_book_entries
    where id = p_id and branch_id <> v_actor.branch_id
  ) then
    raise exception 'Cabang tidak sesuai akses Anda';
  end if;

  delete from public.cash_book_entries where id = p_id;
end;
$$;
revoke execute on function public.fn_delete_cash_book_entry(text, text) from public, anon, authenticated;
grant execute on function public.fn_delete_cash_book_entry(text, text) to service_role;

-- Simpan (buat/ubah nama) kategori kas.
create or replace function public.fn_save_cash_book_category(p_payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor record;
  v_id text := nullif(trim(coalesce(p_payload ->> 'id', '')), '');
  v_type text := trim(coalesce(p_payload ->> 'type', ''));
  v_name text := trim(coalesce(p_payload ->> 'name', ''));
  v_existing record;
begin
  select e.id, e.role into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = (p_payload ->> 'actorId')
    and e.is_active = true
    and rp.can_access_cash_book = true;

  if v_actor.id is null then
    raise exception 'Anda tidak punya akses buku kas';
  end if;

  if v_type not in ('masuk', 'keluar') then
    raise exception 'Jenis kategori tidak dikenal';
  end if;

  if length(v_name) < 2 then
    raise exception 'Nama kategori minimal 2 karakter';
  end if;

  if exists (
    select 1 from public.cash_book_categories
    where type = v_type
      and lower(trim(name)) = lower(v_name)
      and id <> coalesce(v_id, '')
  ) then
    raise exception 'Nama kategori sudah dipakai';
  end if;

  if v_id is null then
    v_id := public.gen_id('cbc');
    insert into public.cash_book_categories (id, type, name)
    values (v_id, v_type, v_name);
    return v_id;
  end if;

  select id, type into v_existing
  from public.cash_book_categories
  where id = v_id;

  if v_existing.id is null then
    raise exception 'Kategori tidak ditemukan';
  end if;
  if v_existing.type <> v_type then
    raise exception 'Jenis kategori tidak bisa diubah';
  end if;

  update public.cash_book_categories set
    name = v_name,
    updated_at = now()
  where id = v_id;

  return v_id;
end;
$$;
revoke execute on function public.fn_save_cash_book_category(jsonb) from public, anon, authenticated;
grant execute on function public.fn_save_cash_book_category(jsonb) to service_role;

-- Aktif/nonaktifkan kategori (kategori terpakai tidak dihapus).
create or replace function public.fn_set_cash_book_category_active(
  p_id text,
  p_active boolean,
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
  select e.id into v_actor
  from public.employees e
  join public.role_permissions rp on rp.role = e.role
  where e.id = p_actor_id
    and e.is_active = true
    and rp.can_access_cash_book = true;

  if v_actor.id is null then
    raise exception 'Anda tidak punya akses buku kas';
  end if;

  if not exists (select 1 from public.cash_book_categories where id = p_id) then
    raise exception 'Kategori tidak ditemukan';
  end if;

  update public.cash_book_categories set
    is_active = p_active,
    updated_at = now()
  where id = p_id;
end;
$$;
revoke execute on function public.fn_set_cash_book_category_active(text, boolean, text) from public, anon, authenticated;
grant execute on function public.fn_set_cash_book_category_active(text, boolean, text) to service_role;
