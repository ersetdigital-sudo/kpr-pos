-- RPC atomik untuk pengaturan usaha, rekening, bonus tiers, dan cabang.
-- Dipanggil hanya dari server action memakai service_role.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant execute on function public.gen_id(text) to service_role;

-- ===== Bootstrap pengaturan + cabang sekali =====
create or replace function public.fn_bootstrap_settings_branches(p_payload jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_settings jsonb := p_payload -> 'settings';
  v_branches jsonb := coalesce(p_payload -> 'branches', '[]'::jsonb);
  v_methods text[];
  v_paper smallint;
  v_start time;
  v_end time;
  v_type text;
  v_piece integer;
  v_percent numeric;
  v_tiers jsonb;
  v_name text;
  v_address text;
  v_phone text;
  v_logo text;
begin
  perform pg_advisory_xact_lock(hashtext('kpr-settings-branch-bootstrap'));

  if exists (
    select 1 from public.settings
    where id = 1 and data_imported_at is not null
  ) then
    return false;
  end if;

  if v_settings is null then
    raise exception 'Data pengaturan kosong';
  end if;

  if jsonb_array_length(v_branches) = 0 then
    raise exception 'Data cabang kosong';
  end if;

  v_name := trim(coalesce(v_settings -> 'business' ->> 'name', ''));
  v_address := trim(coalesce(v_settings -> 'business' ->> 'address', ''));
  v_phone := trim(coalesce(v_settings -> 'business' ->> 'phone', ''));
  v_logo := nullif(trim(coalesce(v_settings -> 'business' ->> 'logoUrl', '')), '');

  if length(v_name) < 2 then raise exception 'Nama usaha minimal 2 karakter'; end if;
  if length(v_address) < 5 then raise exception 'Alamat usaha minimal 5 karakter'; end if;
  if length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 8 then
    raise exception 'No. telp usaha minimal 8 digit';
  end if;

  select coalesce(array_agg(distinct value), '{}'::text[])
  into v_methods
  from jsonb_array_elements_text(
    coalesce(v_settings -> 'payment' -> 'enabledMethods', '[]'::jsonb)
  ) as t(value);

  if cardinality(v_methods) = 0 then
    raise exception 'Minimal satu metode pembayaran harus aktif';
  end if;

  if exists (
    select 1 from unnest(v_methods) as t(method)
    where t.method not in ('Cash', 'QRIS', 'Transfer')
  ) then
    raise exception 'Metode pembayaran tidak dikenal';
  end if;

  v_paper := coalesce((v_settings -> 'receipt' ->> 'paperSize')::smallint, 80);

  if v_paper not in (58, 80) then
    raise exception 'Ukuran struk harus 58 atau 80 mm';
  end if;

  v_start := coalesce(
    (v_settings -> 'attendance' ->> 'workStartTime')::time,
    '08:00'::time
  );
  v_end := coalesce(
    (v_settings -> 'attendance' ->> 'workEndTime')::time,
    '17:00'::time
  );

  if v_start >= v_end then
    raise exception 'Jam pulang harus setelah jam masuk';
  end if;

  v_type := coalesce(v_settings -> 'salesBonus' ->> 'type', 'per_piece');

  if v_type not in ('per_piece', 'percent', 'tiered') then
    raise exception 'Jenis bonus sales tidak dikenal';
  end if;

  v_piece := greatest(
    0,
    coalesce((v_settings -> 'salesBonus' ->> 'perPieceAmount')::integer, 0)
  );
  v_percent := coalesce(
    (v_settings -> 'salesBonus' ->> 'percentRate')::numeric,
    0
  );
  v_tiers := coalesce(v_settings -> 'salesBonus' -> 'tiers', '[]'::jsonb);

  if v_percent < 0 or v_percent > 100 then
    raise exception 'Persentase bonus harus antara 0 dan 100';
  end if;

  if v_type = 'tiered' and jsonb_array_length(v_tiers) = 0 then
    raise exception 'Tambahkan minimal satu tingkat bonus';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_tiers) as tier(value)
    where coalesce((tier.value ->> 'minQuantity')::integer, 0) < 0
      or coalesce((tier.value ->> 'amountPerPiece')::integer, 0) <= 0
  ) then
    raise exception 'Target dan nominal bonus tidak valid';
  end if;

  if (
    select count(*) from jsonb_array_elements(v_tiers)
  ) <> (
    select count(distinct (tier.value ->> 'minQuantity')::integer)
    from jsonb_array_elements(v_tiers) as tier(value)
  ) then
    raise exception 'Target pcs antar tingkat tidak boleh sama';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(
      coalesce(v_settings -> 'payment' -> 'bankAccounts', '[]'::jsonb)
    ) as account(value)
    where length(trim(coalesce(account.value ->> 'bankName', ''))) < 2
      or length(regexp_replace(
        coalesce(account.value ->> 'accountNumber', ''), '\s', '', 'g'
      )) < 5
      or length(trim(coalesce(account.value ->> 'accountHolder', ''))) < 2
  ) then
    raise exception 'Data rekening tidak valid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_branches)
      as branch(id text, name text, address text, phone text)
    where length(trim(coalesce(branch.name, ''))) < 2
      or length(trim(coalesce(branch.address, ''))) < 5
      or length(regexp_replace(
        coalesce(branch.phone, ''), '[^0-9]', '', 'g'
      )) < 8
  ) then
    raise exception 'Data cabang tidak valid';
  end if;

  insert into public.branches (id, name, address, phone, is_active)
  select
    branch.value ->> 'id',
    trim(branch.value ->> 'name'),
    trim(branch.value ->> 'address'),
    trim(branch.value ->> 'phone'),
    coalesce((branch.value ->> 'isActive')::boolean, true)
  from jsonb_array_elements(v_branches) as branch(value)
  on conflict (id) do update
    set name = excluded.name,
        address = excluded.address,
        phone = excluded.phone,
        is_active = excluded.is_active;

  insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
  select branch.id, product.id, 0, 5
  from public.branches branch
  cross join public.products product
  on conflict (branch_id, product_id) do nothing;

  insert into public.settings (
    id, business_name, business_address, business_phone, business_logo_url,
    enabled_payment_methods, receipt_paper_size, receipt_footer,
    work_start_time, work_end_time, bonus_type, bonus_per_piece_amount,
    bonus_percent_rate, data_imported_at, updated_at
  ) values (
    1, v_name, v_address, v_phone, v_logo,
    v_methods, v_paper,
    coalesce(v_settings -> 'receipt' ->> 'footerText', ''),
    v_start, v_end, v_type, v_piece, v_percent, now(), now()
  )
  on conflict (id) do update
    set business_name = excluded.business_name,
        business_address = excluded.business_address,
        business_phone = excluded.business_phone,
        business_logo_url = excluded.business_logo_url,
        enabled_payment_methods = excluded.enabled_payment_methods,
        receipt_paper_size = excluded.receipt_paper_size,
        receipt_footer = excluded.receipt_footer,
        work_start_time = excluded.work_start_time,
        work_end_time = excluded.work_end_time,
        bonus_type = excluded.bonus_type,
        bonus_per_piece_amount = excluded.bonus_per_piece_amount,
        bonus_percent_rate = excluded.bonus_percent_rate,
        data_imported_at = now(),
        updated_at = now();

  delete from public.bank_accounts;

  insert into public.bank_accounts (
    id, bank_name, account_number, account_holder, sort_order
  )
  select
    coalesce(nullif(trim(account.value ->> 'id'), ''), public.gen_id('bank')),
    trim(account.value ->> 'bankName'),
    trim(account.value ->> 'accountNumber'),
    trim(account.value ->> 'accountHolder'),
    account.ordinality::integer - 1
  from jsonb_array_elements(
    coalesce(v_settings -> 'payment' -> 'bankAccounts', '[]'::jsonb)
  ) with ordinality as account(value, ordinality);

  delete from public.bonus_tiers;

  insert into public.bonus_tiers (id, min_quantity, amount_per_piece)
  select
    public.gen_id('tier'),
    (tier.value ->> 'minQuantity')::integer,
    (tier.value ->> 'amountPerPiece')::integer
  from jsonb_array_elements(v_tiers) as tier(value)
  order by (tier.value ->> 'minQuantity')::integer desc;

  return true;
end;
$$;

-- ===== Profil usaha =====
create or replace function public.fn_update_business_profile(
  p_name text,
  p_address text,
  p_phone text,
  p_logo_url text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_address text := trim(coalesce(p_address, ''));
  v_phone text := trim(coalesce(p_phone, ''));
begin
  if length(v_name) < 2 then raise exception 'Nama usaha minimal 2 karakter'; end if;
  if length(v_address) < 5 then raise exception 'Alamat usaha minimal 5 karakter'; end if;
  if length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 8 then
    raise exception 'No. telp minimal 8 digit';
  end if;

  update public.settings set
    business_name = v_name,
    business_address = v_address,
    business_phone = v_phone,
    business_logo_url = nullif(trim(coalesce(p_logo_url, '')), ''),
    updated_at = now()
  where id = 1;

  if not found then raise exception 'Pengaturan belum siap. Muat ulang halaman.'; end if;
end;
$$;

-- ===== Metode pembayaran =====
create or replace function public.fn_toggle_payment_method(
  p_method text,
  p_enabled boolean
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_current text[];
  v_next text[];
begin
  if p_method is null or p_method not in ('Cash', 'QRIS', 'Transfer') then
    raise exception 'Metode pembayaran tidak dikenal';
  end if;

  select enabled_payment_methods into v_current
  from public.settings where id = 1 for update;

  if not found then raise exception 'Pengaturan belum siap. Muat ulang halaman.'; end if;

  if p_enabled then
    v_next := array_append(v_current, p_method);
  else
    v_next := array_remove(v_current, p_method);
  end if;

  v_next := array(select distinct t.method from unnest(v_next) as t(method));

  if cardinality(v_next) = 0 then
    raise exception 'Minimal satu metode pembayaran harus aktif';
  end if;

  update public.settings set
    enabled_payment_methods = v_next,
    updated_at = now()
  where id = 1;
end;
$$;

-- ===== Rekening transfer =====
create or replace function public.fn_add_bank_account(
  p_bank_name text,
  p_account_number text,
  p_account_holder text
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_id text := public.gen_id('bank');
  v_bank_name text := trim(coalesce(p_bank_name, ''));
  v_account_number text := trim(coalesce(p_account_number, ''));
  v_account_holder text := trim(coalesce(p_account_holder, ''));
begin
  if length(v_bank_name) < 2 then raise exception 'Nama bank minimal 2 karakter'; end if;
  if length(regexp_replace(v_account_number, '\s', '', 'g')) < 5 then
    raise exception 'Nomor rekening minimal 5 digit';
  end if;
  if length(v_account_holder) < 2 then raise exception 'Nama pemilik rekening minimal 2 karakter'; end if;

  insert into public.bank_accounts (
    id, bank_name, account_number, account_holder, sort_order
  ) values (
    v_id, v_bank_name, v_account_number, v_account_holder,
    coalesce((select max(sort_order) + 1 from public.bank_accounts), 0)
  );

  return v_id;
end;
$$;

create or replace function public.fn_update_bank_account(
  p_id text,
  p_bank_name text,
  p_account_number text,
  p_account_holder text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_bank_name text := trim(coalesce(p_bank_name, ''));
  v_account_number text := trim(coalesce(p_account_number, ''));
  v_account_holder text := trim(coalesce(p_account_holder, ''));
begin
  if not exists (select 1 from public.bank_accounts where id = p_id) then
    raise exception 'Rekening tidak ditemukan';
  end if;
  if length(v_bank_name) < 2 then raise exception 'Nama bank minimal 2 karakter'; end if;
  if length(regexp_replace(v_account_number, '\s', '', 'g')) < 5 then
    raise exception 'Nomor rekening minimal 5 digit';
  end if;
  if length(v_account_holder) < 2 then raise exception 'Nama pemilik rekening minimal 2 karakter'; end if;

  update public.bank_accounts set
    bank_name = v_bank_name,
    account_number = v_account_number,
    account_holder = v_account_holder
  where id = p_id;
end;
$$;

create or replace function public.fn_delete_bank_account(p_id text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_methods text[];
begin
  select enabled_payment_methods into v_methods
  from public.settings where id = 1;

  if 'Transfer' = any(coalesce(v_methods, '{}'::text[]))
    and (select count(*) from public.bank_accounts) <= 1 then
    raise exception 'Minimal satu rekening harus tersedia selama Transfer aktif';
  end if;

  delete from public.bank_accounts where id = p_id;

  if not found then raise exception 'Rekening tidak ditemukan'; end if;
end;
$$;

-- ===== Struk =====
create or replace function public.fn_update_receipt_settings(
  p_paper_size integer,
  p_footer text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_footer text := trim(coalesce(p_footer, ''));
begin
  if p_paper_size is null or p_paper_size not in (58, 80) then
    raise exception 'Ukuran struk harus 58 atau 80 mm';
  end if;
  if length(v_footer) < 3 then
    raise exception 'Teks footer struk minimal 3 karakter';
  end if;

  update public.settings set
    receipt_paper_size = p_paper_size,
    receipt_footer = v_footer,
    updated_at = now()
  where id = 1;

  if not found then raise exception 'Pengaturan belum siap. Muat ulang halaman.'; end if;
end;
$$;

-- ===== Jam kerja =====
create or replace function public.fn_update_attendance_settings(
  p_start time,
  p_end time
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_start is null or p_end is null then
    raise exception 'Jam masuk dan jam pulang wajib diisi';
  end if;
  if p_start >= p_end then
    raise exception 'Jam pulang harus setelah jam masuk';
  end if;

  update public.settings set
    work_start_time = p_start,
    work_end_time = p_end,
    updated_at = now()
  where id = 1;

  if not found then raise exception 'Pengaturan belum siap. Muat ulang halaman.'; end if;
end;
$$;

-- ===== Bonus sales =====
create or replace function public.fn_update_sales_bonus(
  p_type text,
  p_per_piece integer,
  p_percent numeric,
  p_tiers jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_type is null or p_type not in ('per_piece', 'percent', 'tiered') then
    raise exception 'Jenis bonus sales tidak dikenal';
  end if;
  if coalesce(p_per_piece, 0) < 0 then
    raise exception 'Bonus per pcs tidak boleh negatif';
  end if;
  if coalesce(p_percent, 0) < 0 or coalesce(p_percent, 0) > 100 then
    raise exception 'Persentase bonus harus antara 0 dan 100';
  end if;
  if p_type = 'per_piece' and coalesce(p_per_piece, 0) <= 0 then
    raise exception 'Bonus per pcs harus lebih dari 0';
  end if;
  if p_type = 'percent' and coalesce(p_percent, 0) <= 0 then
    raise exception 'Persentase bonus harus lebih dari 0';
  end if;
  if p_type = 'tiered' and jsonb_array_length(coalesce(p_tiers, '[]'::jsonb)) = 0 then
    raise exception 'Tambahkan minimal satu tingkat target';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) as tier(value)
    where coalesce((tier.value ->> 'minQuantity')::integer, 0) < 0
      or coalesce((tier.value ->> 'amountPerPiece')::integer, 0) <= 0
  ) then
    raise exception 'Target dan nominal bonus tidak valid';
  end if;

  if (
    select count(*) from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb))
  ) <> (
    select count(distinct (tier.value ->> 'minQuantity')::integer)
    from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) as tier(value)
  ) then
    raise exception 'Target pcs antar tingkat tidak boleh sama';
  end if;

  update public.settings set
    bonus_type = p_type,
    bonus_per_piece_amount = coalesce(p_per_piece, 0),
    bonus_percent_rate = coalesce(p_percent, 0),
    updated_at = now()
  where id = 1;

  if not found then raise exception 'Pengaturan belum siap. Muat ulang halaman.'; end if;

  delete from public.bonus_tiers;

  insert into public.bonus_tiers (id, min_quantity, amount_per_piece)
  select
    public.gen_id('tier'),
    (tier.value ->> 'minQuantity')::integer,
    (tier.value ->> 'amountPerPiece')::integer
  from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) as tier(value)
  order by (tier.value ->> 'minQuantity')::integer desc;
end;
$$;

-- ===== Cabang =====
create or replace function public.fn_create_branch(
  p_name text,
  p_address text,
  p_phone text
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_id text := public.gen_id('br');
  v_name text := trim(coalesce(p_name, ''));
  v_address text := trim(coalesce(p_address, ''));
  v_phone text := trim(coalesce(p_phone, ''));
begin
  if length(v_name) < 2 then raise exception 'Nama cabang minimal 2 karakter'; end if;
  if length(v_address) < 5 then raise exception 'Alamat cabang minimal 5 karakter'; end if;
  if length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 8 then
    raise exception 'No. telp minimal 8 digit';
  end if;
  if exists (
    select 1 from public.branches
    where lower(trim(name)) = lower(v_name)
  ) then
    raise exception 'Nama cabang sudah dipakai';
  end if;

  insert into public.branches (id, name, address, phone, is_active)
  values (v_id, v_name, v_address, v_phone, true);

  insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
  select v_id, product.id, 0, 5 from public.products product
  on conflict (branch_id, product_id) do nothing;

  return v_id;
end;
$$;

create or replace function public.fn_update_branch(
  p_id text,
  p_name text,
  p_address text,
  p_phone text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_address text := trim(coalesce(p_address, ''));
  v_phone text := trim(coalesce(p_phone, ''));
begin
  if not exists (select 1 from public.branches where id = p_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;
  if length(v_name) < 2 then raise exception 'Nama cabang minimal 2 karakter'; end if;
  if length(v_address) < 5 then raise exception 'Alamat cabang minimal 5 karakter'; end if;
  if length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 8 then
    raise exception 'No. telp minimal 8 digit';
  end if;
  if exists (
    select 1 from public.branches
    where id <> p_id and lower(trim(name)) = lower(v_name)
  ) then
    raise exception 'Nama cabang sudah dipakai';
  end if;

  update public.branches set
    name = v_name,
    address = v_address,
    phone = v_phone
  where id = p_id;
end;
$$;

create or replace function public.fn_set_branch_active(
  p_id text,
  p_active boolean
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.branches where id = p_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;

  if not p_active then
    if (
      select count(*) from public.branches
      where is_active = true and id <> p_id
    ) = 0 then
      raise exception 'Minimal harus ada satu cabang aktif';
    end if;
  end if;

  update public.branches set is_active = p_active where id = p_id;
end;
$$;

-- ===== Hak akses: hanya server/service role =====
revoke execute on function public.fn_bootstrap_settings_branches(jsonb) from public, anon, authenticated;
revoke execute on function public.fn_update_business_profile(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.fn_toggle_payment_method(text, boolean) from public, anon, authenticated;
revoke execute on function public.fn_add_bank_account(text, text, text) from public, anon, authenticated;
revoke execute on function public.fn_update_bank_account(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.fn_delete_bank_account(text) from public, anon, authenticated;
revoke execute on function public.fn_update_receipt_settings(integer, text) from public, anon, authenticated;
revoke execute on function public.fn_update_attendance_settings(time, time) from public, anon, authenticated;
revoke execute on function public.fn_update_sales_bonus(text, integer, numeric, jsonb) from public, anon, authenticated;
revoke execute on function public.fn_create_branch(text, text, text) from public, anon, authenticated;
revoke execute on function public.fn_update_branch(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.fn_set_branch_active(text, boolean) from public, anon, authenticated;

grant execute on function public.fn_bootstrap_settings_branches(jsonb) to service_role;
grant execute on function public.fn_update_business_profile(text, text, text, text) to service_role;
grant execute on function public.fn_toggle_payment_method(text, boolean) to service_role;
grant execute on function public.fn_add_bank_account(text, text, text) to service_role;
grant execute on function public.fn_update_bank_account(text, text, text, text) to service_role;
grant execute on function public.fn_delete_bank_account(text) to service_role;
grant execute on function public.fn_update_receipt_settings(integer, text) to service_role;
grant execute on function public.fn_update_attendance_settings(time, time) to service_role;
grant execute on function public.fn_update_sales_bonus(text, integer, numeric, jsonb) to service_role;
grant execute on function public.fn_create_branch(text, text, text) to service_role;
grant execute on function public.fn_update_branch(text, text, text, text) to service_role;
grant execute on function public.fn_set_branch_active(text, boolean) to service_role;
