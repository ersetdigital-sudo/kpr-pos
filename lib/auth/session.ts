import "server-only";

import { cache } from "react";
import { ALL_ROLES, ROLES, type Role } from "@/constants/roles";
import { ROLE_PERMISSIONS, type RolePermissions } from "@/config/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Branch, Employee } from "@/lib/store/types";
import type { SessionState } from "@/features/session/types";

interface EmployeeRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  initials: string;
  role: string;
  branch_id: string;
  is_active: boolean;
}

interface BranchRow {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
}

interface RolePermissionsRow {
  role: Role;
  can_apply_discount: boolean;
  can_cancel_transaction: boolean;
  can_manage_products: boolean;
  can_create_sales_order: boolean;
  can_manage_sales_orders: boolean;
  can_delete_sales_order: boolean;
  can_export_reports: boolean;
  can_view_all_branches: boolean;
  can_view_all_attendance: boolean;
  can_approve_leave: boolean;
  can_manage_employees: boolean;
  can_manage_branches: boolean;
  can_manage_settings: boolean;
  can_use_cashier: boolean;
  can_view_products: boolean;
}

function mapPermissions(row: RolePermissionsRow): RolePermissions {
  return {
    canApplyDiscount: row.can_apply_discount,
    canCancelTransaction: row.can_cancel_transaction,
    canManageProducts: row.can_manage_products,
    canCreateSalesOrder: row.can_create_sales_order,
    canManageSalesOrders: row.can_manage_sales_orders,
    canDeleteSalesOrder: row.can_delete_sales_order,
    canExportReports: row.can_export_reports,
    canViewAllBranches: row.can_view_all_branches,
    canViewAllAttendance: row.can_view_all_attendance,
    canApproveLeave: row.can_approve_leave,
    canManageEmployees: row.can_manage_employees,
    canManageBranches: row.can_manage_branches,
    canManageSettings: row.can_manage_settings,
    canUseCashier: row.can_use_cashier,
    canViewProducts: row.can_view_products,
  };
}

function isRole(value: string): value is Role {
  return (ALL_ROLES as readonly string[]).includes(value);
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    initials: row.initials,
    role: row.role as Role,
    branchId: row.branch_id,
    isActive: row.is_active,
  };
}

function mapBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    isActive: row.is_active,
  };
}

/**
 * Sesi server dari Supabase Auth + tabel employees. Null berarti belum login,
 * user tidak punya employee, atau karyawannya nonaktif.
 */
export const getAuthSession = cache(async (): Promise<SessionState | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [employeeResult, branchResult, permissionResult] = await Promise.all([
    supabase
      .from("employees")
      .select("id,user_id,name,phone,initials,role,branch_id,is_active")
      .order("name"),
    supabase
      .from("branches")
      .select("id,name,address,phone,is_active")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("role_permissions")
      .select(
        "role,can_apply_discount,can_cancel_transaction,can_manage_products,can_create_sales_order,can_manage_sales_orders,can_delete_sales_order,can_export_reports,can_view_all_branches,can_view_all_attendance,can_approve_leave,can_manage_employees,can_manage_branches,can_manage_settings,can_use_cashier,can_view_products",
      ),
  ]);

  if (employeeResult.error || branchResult.error || permissionResult.error) {
    return null;
  }

  const employeeRows = (employeeResult.data ?? []) as EmployeeRow[];
  const employeeRow = employeeRows.find(
    (row) => row.user_id === user.id && row.is_active,
  );

  if (!employeeRow || !isRole(employeeRow.role)) return null;

  const branches = ((branchResult.data ?? []) as BranchRow[]).map(mapBranch);
  const branch =
    branches.find((item) => item.id === employeeRow.branch_id) ?? branches[0];

  if (!branch) return null;

  const employees = employeeRows
    .filter((row) => isRole(row.role))
    .map(mapEmployee);

  const permissionRow = ((permissionResult.data ?? []) as RolePermissionsRow[])
    .find((row) => row.role === employeeRow.role);
  const permissions = permissionRow
    ? mapPermissions(permissionRow)
    : ROLE_PERMISSIONS[employeeRow.role];

  return {
    employee: mapEmployee(employeeRow),
    branch,
    employees,
    branches,
    isOwner: employeeRow.role === ROLES.OWNER,
    permissions,
  };
});

export async function getAuthorizedSession(
  permission: keyof RolePermissions,
): Promise<SessionState | null> {
  const session = await getAuthSession();
  if (!session) return null;

  return session.permissions[permission] ? session : null;
}
