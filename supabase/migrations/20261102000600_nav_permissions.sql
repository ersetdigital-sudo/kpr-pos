-- Izin akses menu yang dapat diatur Owner.

alter table public.role_permissions
  add column if not exists can_use_cashier boolean not null default false;
alter table public.role_permissions
  add column if not exists can_view_products boolean not null default false;

update public.role_permissions set can_use_cashier = true
where role in ('Owner', 'Manager', 'Supervisor', 'Cashier');

update public.role_permissions set can_view_products = true
where role in ('Owner', 'Manager', 'Supervisor', 'Inventory');

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
