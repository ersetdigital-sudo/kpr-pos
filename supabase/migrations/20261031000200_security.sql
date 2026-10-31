-- ===== Helper akses =====
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.current_employee()
returns table (id text, role text, branch_id text, is_active boolean)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.role, e.branch_id, e.is_active
  from public.employees e
  where e.user_id = (select auth.uid())
  limit 1;
$$;
revoke execute on function private.current_employee() from public, anon;
grant execute on function private.current_employee() to authenticated;

create or replace function private.current_role() returns text
language sql stable security definer set search_path = ''
as $$ select role from private.current_employee(); $$;
revoke execute on function private.current_role() from public, anon;
grant execute on function private.current_role() to authenticated;

create or replace function private.current_branch() returns text
language sql stable security definer set search_path = ''
as $$ select branch_id from private.current_employee(); $$;
revoke execute on function private.current_branch() from public, anon;
grant execute on function private.current_branch() to authenticated;

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
       else false end
     from public.role_permissions
     where role = (select private.current_role())),
    false);
$$;
revoke execute on function private.has_permission(text) from public, anon;
grant execute on function private.has_permission(text) to authenticated;

create or replace function public.gen_id(prefix text) returns text
language sql volatile set search_path = ''
as $$ select prefix || '-' || replace(gen_random_uuid()::text, '-', ''); $$;
revoke execute on function public.gen_id(text) from public, anon;
grant execute on function public.gen_id(text) to authenticated;

-- ===== RLS =====
alter table public.branches enable row level security;
alter table public.employees enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.stock_levels enable row level security;
alter table public.settings enable row level security;
alter table public.bonus_tiers enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.role_permissions enable row level security;
alter table public.invoice_counters enable row level security;
alter table public.sales_order_counters enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.cart_drafts enable row level security;
alter table public.cart_draft_items enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.stock_ins enable row level security;
alter table public.stock_in_items enable row level security;
alter table public.stock_opnames enable row level security;
alter table public.stock_opname_items enable row level security;
alter table public.stock_transfers enable row level security;
alter table public.stock_transfer_items enable row level security;
alter table public.attendance enable row level security;
alter table public.leave_requests enable row level security;
alter table public.activity_logs enable row level security;

-- Referensi master dan pengaturan boleh dibaca seluruh user login.
create policy branches_read on public.branches
  for select to authenticated using (true);
create policy employees_read on public.employees
  for select to authenticated using (true);
create policy categories_read on public.categories
  for select to authenticated using (true);
create policy products_read on public.products
  for select to authenticated using (true);
create policy stock_levels_read on public.stock_levels
  for select to authenticated using (true);
create policy settings_read on public.settings
  for select to authenticated using (true);
create policy bonus_tiers_read on public.bonus_tiers
  for select to authenticated using (true);
create policy bank_accounts_read on public.bank_accounts
  for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions
  for select to authenticated using (true);

-- Transaksi kasir: semua cabang atau cabang sendiri.
create policy transactions_read on public.transactions
  for select to authenticated
  using (
    (select private.has_permission('can_view_all_branches'))
    or branch_id = (select private.current_branch())
  );
create policy transaction_items_read on public.transaction_items
  for select to authenticated
  using (
    exists (
      select 1 from public.transactions t where t.id = transaction_id
    )
  );

-- Draft hanya milik kasir yang membuatnya.
create policy cart_drafts_read on public.cart_drafts
  for select to authenticated
  using (cashier_id = (select id from private.current_employee()));
create policy cart_draft_items_read on public.cart_draft_items
  for select to authenticated
  using (
    exists (
      select 1 from public.cart_drafts d where d.id = draft_id
    )
  );

-- Pesanan sales: pengelola pesanan atau sales pemiliknya.
create policy sales_orders_read on public.sales_orders
  for select to authenticated
  using (
    (select private.has_permission('can_manage_sales_orders'))
    or sales_employee_id = (select id from private.current_employee())
  );
create policy sales_order_items_read on public.sales_order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.sales_orders o where o.id = order_id
    )
  );

-- Stok masuk/opname/transfer: pengelola produk atau cabang terkait.
create policy stock_ins_read on public.stock_ins
  for select to authenticated
  using (
    (select private.has_permission('can_manage_products'))
    or branch_id = (select private.current_branch())
  );
create policy stock_in_items_read on public.stock_in_items
  for select to authenticated
  using (
    exists (
      select 1 from public.stock_ins s where s.id = stock_in_id
    )
  );

create policy stock_opnames_read on public.stock_opnames
  for select to authenticated
  using (
    (select private.has_permission('can_manage_products'))
    or branch_id = (select private.current_branch())
  );
create policy stock_opname_items_read on public.stock_opname_items
  for select to authenticated
  using (
    exists (
      select 1 from public.stock_opnames o where o.id = opname_id
    )
  );

create policy stock_transfers_read on public.stock_transfers
  for select to authenticated
  using (
    (select private.has_permission('can_manage_products'))
    or from_branch_id = (select private.current_branch())
    or to_branch_id = (select private.current_branch())
  );
create policy stock_transfer_items_read on public.stock_transfer_items
  for select to authenticated
  using (
    exists (
      select 1 from public.stock_transfers t where t.id = transfer_id
    )
  );

create policy attendance_read on public.attendance
  for select to authenticated
  using (
    (select private.has_permission('can_view_all_attendance'))
    or employee_id = (select id from private.current_employee())
  );

create policy leave_requests_read on public.leave_requests
  for select to authenticated
  using (
    (select private.has_permission('can_approve_leave'))
    or employee_id = (select id from private.current_employee())
  );

create policy activity_logs_read on public.activity_logs
  for select to authenticated
  using ((select private.has_permission('can_export_reports')));

-- ===== Privilege =====
-- Anon tidak boleh menyentuh data sama sekali.
revoke all on all tables in schema public from anon;

-- Semua penulisan lewat RPC security definer; role login hanya boleh SELECT.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;

-- ===== Seed matriks role =====
insert into public.role_permissions (
  role,
  can_apply_discount,
  can_cancel_transaction,
  can_manage_products,
  can_create_sales_order,
  can_manage_sales_orders,
  can_export_reports,
  can_view_all_branches,
  can_view_all_attendance,
  can_approve_leave,
  can_manage_employees,
  can_manage_branches,
  can_manage_settings
) values
  ('Owner',      true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true),
  ('Manager',    true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  false, false),
  ('Supervisor', true,  true,  false, true,  true,  false, true,  true,  false, false, false, false),
  ('Cashier',    false, false, false, false, false, false, false, false, false, false, false, false),
  ('Inventory',  false, false, true,  false, false, false, true,  false, false, false, false, false),
  ('Accountant', false, false, false, false, false, true,  true,  false, false, false, false, false),
  ('Sales',      false, false, false, true,  false, false, false, false, false, false, false, false),
  ('Staff',      false, false, false, false, false, false, false, false, false, false, false, false)
on conflict (role) do nothing;
