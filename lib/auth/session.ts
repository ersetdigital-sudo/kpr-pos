import "server-only";

import { cache } from "react";
import { ALL_ROLES, ROLES, type Role } from "@/constants/roles";
import {
  ROLE_PERMISSIONS,
  ROLE_PERMISSIONS_SELECT,
  mapRolePermissionsRow,
  type RolePermissions,
  type RolePermissionsRow,
} from "@/config/permissions";
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
 * Data karyawan, cabang, dan hak akses dimuat sekali per request lalu dipakai
 * ulang oleh semua pembaca sesi (React cache).
 */
const loadSessionForUser = cache(
  async (userId: string): Promise<SessionState | null> => {
    const supabase = await createSupabaseServerClient();

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
      supabase.from("role_permissions").select(ROLE_PERMISSIONS_SELECT),
    ]);

    if (employeeResult.error || branchResult.error || permissionResult.error) {
      return null;
    }

    const employeeRows = (employeeResult.data ?? []) as EmployeeRow[];
    const employeeRow = employeeRows.find(
      (row) => row.user_id === userId && row.is_active,
    );

    if (!employeeRow || !isRole(employeeRow.role)) return null;

    const branches = ((branchResult.data ?? []) as BranchRow[]).map(mapBranch);
    const branch =
      branches.find((item) => item.id === employeeRow.branch_id) ??
      branches[0];

    if (!branch) return null;

    const employees = employeeRows
      .filter((row) => isRole(row.role))
      .map(mapEmployee);

    const permissionRow = (
      (permissionResult.data ?? []) as unknown as (RolePermissionsRow & {
        role: string;
      })[]
    ).find((row) => row.role === employeeRow.role);
    const permissions = permissionRow
      ? mapRolePermissionsRow(permissionRow)
      : ROLE_PERMISSIONS[employeeRow.role];

    return {
      employee: mapEmployee(employeeRow),
      branch,
      employees,
      branches,
      isOwner: employeeRow.role === ROLES.OWNER,
      permissions,
    };
  },
);

/**
 * Sesi untuk operasi baca: JWT diverifikasi lokal lewat getClaims sehingga
 * tidak ada panggilan jaringan tambahan ke Supabase Auth.
 */
export const getReadSession = cache(
  async (): Promise<SessionState | null> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error) return null;

    const userId = data?.claims?.sub;
    if (typeof userId !== "string" || !userId) return null;

    return loadSessionForUser(userId);
  },
);

/**
 * Sesi ketat untuk aksi tulis: user diverifikasi ke Supabase Auth, lalu
 * karyawan/role/permission diambil dari cache request yang sama.
 */
export const getAuthSession = cache(
  async (): Promise<SessionState | null> => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    return loadSessionForUser(user.id);
  },
);

export async function getAuthorizedSession(
  permission: keyof RolePermissions,
): Promise<SessionState | null> {
  const session = await getAuthSession();
  if (!session) return null;

  return session.permissions[permission] ? session : null;
}
