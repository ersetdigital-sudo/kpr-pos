import "server-only";

import { ALL_ROLES, type Role } from "@/constants/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Employee } from "@/lib/store/types";

interface EmployeeRow {
  id: string;
  name: string;
  phone: string | null;
  initials: string;
  role: string;
  branch_id: string;
  is_active: boolean;
}

function isRole(value: string): value is Role {
  return (ALL_ROLES as readonly string[]).includes(value);
}

/** Daftar karyawan untuk cache tampilan dan filter UI. */
export async function readEmployees(): Promise<Employee[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("employees")
    .select("id,name,phone,initials,role,branch_id,is_active")
    .order("name");

  if (error) throw new Error(error.message);

  return ((data ?? []) as EmployeeRow[])
    .filter((row) => isRole(row.role))
    .map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone ?? "",
      initials: row.initials,
      role: row.role as Role,
      branchId: row.branch_id,
      isActive: row.is_active,
    }));
}
