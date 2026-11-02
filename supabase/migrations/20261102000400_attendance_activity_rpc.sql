-- RPC absensi, izin, dan log aktivitas.
-- Dipanggil hanya dari server action memakai service_role.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;

create or replace function public.fn_attendance_json(
  p_employee_id text,
  p_date date
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'employeeId', a.employee_id,
    'branchId', a.branch_id,
    'date', to_char(a.date, 'YYYY-MM-DD'),
    'status', a.status,
    'checkIn', case when a.check_in is null then null else to_char(a.check_in, 'HH24:MI') end,
    'checkOut', case when a.check_out is null then null else to_char(a.check_out, 'HH24:MI') end
  )
  from public.attendance a
  where a.employee_id = p_employee_id and a.date = p_date;
$$;

create or replace function public.fn_leave_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', l.id,
    'employeeId', l.employee_id,
    'branchId', l.branch_id,
    'date', to_char(l.date, 'YYYY-MM-DD'),
    'reason', l.reason,
    'status', l.status,
    'reviewedBy', l.reviewed_by,
    'reviewedAt', case
      when l.reviewed_at is null then null
      else to_char(l.reviewed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    end,
    'createdAt', to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
  from public.leave_requests l
  where l.id = p_id;
$$;

create or replace function public.fn_check_in(
  p_employee_id text,
  p_branch_id text,
  p_date date,
  p_time time
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id text;
  v_status text;
begin
  if p_date is null or p_time is null then
    raise exception 'Tanggal dan jam absen wajib diisi';
  end if;
  if not exists (
    select 1 from public.employees where id = p_employee_id and is_active = true
  ) then
    raise exception 'Karyawan aktif tidak ditemukan';
  end if;
  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;

  select id, status into v_id, v_status
  from public.attendance
  where employee_id = p_employee_id and date = p_date
  for update;

  if found then
    if exists (
      select 1 from public.attendance
      where employee_id = p_employee_id and date = p_date and check_in is not null
    ) then
      raise exception 'Kamu sudah absen masuk hari ini';
    end if;

    update public.attendance set
      branch_id = p_branch_id,
      check_in = p_time
    where id = v_id;
  else
    insert into public.attendance (
      id, employee_id, branch_id, date, status, check_in
    ) values (
      public.gen_id('att'), p_employee_id, p_branch_id, p_date, 'Hadir', p_time
    );
  end if;

  return public.fn_attendance_json(p_employee_id, p_date);
end;
$$;

create or replace function public.fn_check_out(
  p_employee_id text,
  p_date date,
  p_time time
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id text;
  v_check_in time;
  v_check_out time;
begin
  if p_date is null or p_time is null then
    raise exception 'Tanggal dan jam absen wajib diisi';
  end if;

  select id, check_in, check_out into v_id, v_check_in, v_check_out
  from public.attendance
  where employee_id = p_employee_id and date = p_date
  for update;

  if not found or v_check_in is null then
    raise exception 'Absen masuk dulu sebelum pulang';
  end if;
  if v_check_out is not null then
    raise exception 'Kamu sudah absen pulang hari ini';
  end if;

  update public.attendance set check_out = p_time where id = v_id;

  return public.fn_attendance_json(p_employee_id, p_date);
end;
$$;

create or replace function public.fn_submit_leave_request(
  p_employee_id text,
  p_date date,
  p_reason text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id text := public.gen_id('leave');
  v_reason text := trim(coalesce(p_reason, ''));
  v_employee public.employees%rowtype;
begin
  if p_date is null then raise exception 'Tanggal izin wajib diisi'; end if;
  if length(v_reason) < 3 then raise exception 'Alasan minimal 3 karakter'; end if;

  select * into v_employee from public.employees
  where id = p_employee_id and is_active = true;
  if not found then raise exception 'Karyawan aktif tidak ditemukan'; end if;

  if p_date < (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Tanggal izin tidak boleh di masa lalu';
  end if;

  if exists (
    select 1 from public.leave_requests
    where employee_id = p_employee_id
      and date = p_date
      and status <> 'Ditolak'
  ) then
    raise exception 'Sudah ada pengajuan izin untuk tanggal itu';
  end if;

  insert into public.leave_requests (
    id, employee_id, branch_id, date, reason, status, created_at
  ) values (
    v_id, p_employee_id, v_employee.branch_id, p_date, v_reason,
    'Menunggu', now()
  );

  return public.fn_leave_json(v_id);
end;
$$;

create or replace function public.fn_review_leave_request(
  p_request_id text,
  p_status text,
  p_reviewer_id text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_request public.leave_requests%rowtype;
begin
  if p_status not in ('Disetujui', 'Ditolak') then
    raise exception 'Status izin tidak valid';
  end if;
  if not exists (
    select 1 from public.employees where id = p_reviewer_id and is_active = true
  ) then
    raise exception 'Sesi pengguna tidak ditemukan';
  end if;

  select * into v_request from public.leave_requests
  where id = p_request_id for update;

  if not found then raise exception 'Pengajuan izin tidak ditemukan'; end if;
  if v_request.status <> 'Menunggu' then
    raise exception 'Pengajuan ini sudah diproses';
  end if;

  update public.leave_requests set
    status = p_status,
    reviewed_by = p_reviewer_id,
    reviewed_at = now()
  where id = p_request_id;

  if p_status = 'Disetujui' then
    insert into public.attendance (
      id, employee_id, branch_id, date, status
    ) values (
      public.gen_id('att'), v_request.employee_id, v_request.branch_id,
      v_request.date, 'Izin'
    )
    on conflict (employee_id, date) do nothing;
  end if;

  return public.fn_leave_json(p_request_id);
end;
$$;

create or replace function public.fn_log_activity(p_payload jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_action text := trim(coalesce(p_payload ->> 'action', ''));
  v_detail text := trim(coalesce(p_payload ->> 'detail', ''));
  v_user_id text := nullif(p_payload ->> 'userId', '');
  v_branch_id text := nullif(p_payload ->> 'branchId', '');
begin
  if length(v_action) < 1 or length(v_detail) < 1 then
    raise exception 'Log aktivitas tidak valid';
  end if;
  if v_user_id is null or v_branch_id is null then
    raise exception 'Log aktivitas tidak valid';
  end if;

  insert into public.activity_logs (
    id, at, user_id, user_name, role, branch_id, action, detail
  ) values (
    coalesce(nullif(p_payload ->> 'id', ''), public.gen_id('log')),
    coalesce(nullif(p_payload ->> 'at', '')::timestamptz, now()),
    v_user_id,
    coalesce(p_payload ->> 'userName', 'Karyawan'),
    coalesce(p_payload ->> 'role', 'Staff'),
    v_branch_id,
    v_action,
    v_detail
  )
  on conflict (id) do nothing;
end;
$$;

create or replace function public.fn_bootstrap_attendance(p_payload jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_attendance jsonb;
  v_leave jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('kpr-attendance-bootstrap'));

  if exists (select 1 from public.attendance limit 1)
    or exists (select 1 from public.leave_requests limit 1) then
    return false;
  end if;

  insert into public.branches (id, name, address, phone, is_active)
  select branch.id, branch.name, branch.address, branch.phone, branch.is_active
  from jsonb_to_recordset(coalesce(p_payload -> 'branches', '[]'::jsonb))
    as branch(id text, name text, address text, phone text, is_active boolean)
  on conflict (id) do nothing;

  insert into public.employees (
    id, name, phone, initials, role, branch_id, is_active
  )
  select employee.id, employee.name, employee.phone, employee.initials,
    employee.role, employee.branch_id, employee.is_active
  from jsonb_to_recordset(coalesce(p_payload -> 'employees', '[]'::jsonb))
    as employee(
      id text, name text, phone text, initials text,
      role text, branch_id text, is_active boolean
    )
  on conflict (id) do nothing;

  for v_attendance in
    select value from jsonb_array_elements(
      coalesce(p_payload -> 'attendance', '[]'::jsonb)
    )
  loop
    insert into public.attendance (
      id, employee_id, branch_id, date, status, check_in, check_out
    ) values (
      v_attendance ->> 'id',
      v_attendance ->> 'employee_id',
      v_attendance ->> 'branch_id',
      (v_attendance ->> 'date')::date,
      v_attendance ->> 'status',
      nullif(v_attendance ->> 'check_in', '')::time,
      nullif(v_attendance ->> 'check_out', '')::time
    )
    on conflict (employee_id, date) do nothing;
  end loop;

  for v_leave in
    select value from jsonb_array_elements(
      coalesce(p_payload -> 'leave_requests', '[]'::jsonb)
    )
  loop
    insert into public.leave_requests (
      id, employee_id, branch_id, date, reason, status,
      reviewed_by, reviewed_at, created_at
    ) values (
      v_leave ->> 'id',
      v_leave ->> 'employee_id',
      v_leave ->> 'branch_id',
      (v_leave ->> 'date')::date,
      v_leave ->> 'reason',
      v_leave ->> 'status',
      nullif(v_leave ->> 'reviewed_by', ''),
      nullif(v_leave ->> 'reviewed_at', '')::timestamptz,
      coalesce(nullif(v_leave ->> 'created_at', '')::timestamptz, now())
    )
    on conflict (id) do nothing;
  end loop;

  return true;
end;
$$;

create or replace function public.fn_bootstrap_activity(p_payload jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('kpr-activity-bootstrap'));

  if exists (select 1 from public.activity_logs limit 1) then
    return false;
  end if;

  insert into public.activity_logs (
    id, at, user_id, user_name, role, branch_id, action, detail
  )
  select
    log.id,
    coalesce(log.at, now()),
    log.user_id,
    log.user_name,
    log.role,
    log.branch_id,
    log.action,
    log.detail
  from jsonb_to_recordset(coalesce(p_payload -> 'activity_logs', '[]'::jsonb))
    as log(
      id text, at timestamptz, user_id text, user_name text,
      role text, branch_id text, action text, detail text
    )
  on conflict (id) do nothing;

  return true;
end;
$$;

revoke execute on function public.fn_attendance_json(text, date) from public, anon, authenticated;
revoke execute on function public.fn_leave_json(text) from public, anon, authenticated;
revoke execute on function public.fn_check_in(text, text, date, time) from public, anon, authenticated;
revoke execute on function public.fn_check_out(text, date, time) from public, anon, authenticated;
revoke execute on function public.fn_submit_leave_request(text, date, text) from public, anon, authenticated;
revoke execute on function public.fn_review_leave_request(text, text, text) from public, anon, authenticated;
revoke execute on function public.fn_log_activity(jsonb) from public, anon, authenticated;
revoke execute on function public.fn_bootstrap_attendance(jsonb) from public, anon, authenticated;
revoke execute on function public.fn_bootstrap_activity(jsonb) from public, anon, authenticated;

grant execute on function public.fn_attendance_json(text, date) to service_role;
grant execute on function public.fn_leave_json(text) to service_role;
grant execute on function public.fn_check_in(text, text, date, time) to service_role;
grant execute on function public.fn_check_out(text, date, time) to service_role;
grant execute on function public.fn_submit_leave_request(text, date, text) to service_role;
grant execute on function public.fn_review_leave_request(text, text, text) to service_role;
grant execute on function public.fn_log_activity(jsonb) to service_role;
grant execute on function public.fn_bootstrap_attendance(jsonb) to service_role;
grant execute on function public.fn_bootstrap_activity(jsonb) to service_role;
