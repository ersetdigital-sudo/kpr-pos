import "server-only";

import { cache } from "react";
import { ALL_ROLES, ROLES, type Role } from "@/constants/roles";
import { ROLE_PERMISSIONS, type RolePermissions } from "@/config/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Branch, Employee } from "@/lib/store/types";
import type { SessionState } from "@/features/session/types";

interface EmployeeRow {
  id: string;
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

  const { data: employeeData, error: employeeError } = await supabase
    .from("employees")
    .select("id,name,phone,initials,role,branch_id,is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (employeeError || !employeeData) return null;

  const employeeRow = employeeData as EmployeeRow;
  if (!employeeRow.is_active || !isRole(employeeRow.role)) return null;

  const { data: branchData, error: branchError } = await supabase
    .from("branches")
    .select("id,name,address,phone,is_active")
    .eq("is_active", true)
    .order("name");

  if (branchError) return null;

  const branches = ((branchData ?? []) as BranchRow[]).map(mapBranch);
  const branch =
    branches.find((item) => item.id === employeeRow.branch_id) ?? branches[0];

  if (!branch) return null;

  const { data: employeeListData } = await supabase
    .from("employees")
    .select("id,name,phone,initials,role,branch_id,is_active")
    .eq("is_active", true)
    .order("name");

  const employees = ((employeeListData ?? []) as EmployeeRow[])
    .filter((row) => isRole(row.role))
    .map(mapEmployee);

  if (!employees.some((item) => item.id === employeeRow.id)) {
    employees.push(mapEmployee(employeeRow));
  }

  return {
    employee: mapEmployee(employeeRow),
    branch,
    employees,
    branches,
    isOwner: employeeRow.role === ROLES.OWNER,
  };
});

export async function getAuthorizedSession(
  permission: keyof RolePermissions,
): Promise<SessionState | null> {
  const session = await getAuthSession();
  if (!session) return null;

  return ROLE_PERMISSIONS[session.employee.role][permission] ? session : null;
}
