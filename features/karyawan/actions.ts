"use server";

import { ALL_ROLES, ROLES, type Role } from "@/constants/roles";
import {
  ROLE_PERMISSIONS,
  type RolePermissions,
} from "@/config/permissions";
import { getAuthSession, getAuthorizedSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import type { CloudActionResult } from "@/lib/cloud/result";
import { buildInitials } from "@/lib/initials";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Branch, Employee } from "@/lib/store/types";
import type {
  EmployeeAccountInput,
  EmployeeAccountResult,
  InviteEmployeeInput,
  InviteEmployeeResult,
} from "@/features/karyawan/types";

const NO_ACCESS = "Anda tidak punya akses untuk mengelola akun karyawan.";
const FAILED = "Layanan akun belum siap. Coba lagi.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRole(value: string): value is Role {
  return (ALL_ROLES as readonly string[]).includes(value);
}

function validateEmployeeInput(input: {
  name: string;
  phone: string;
  role: string;
  branch: Branch;
}): string | null {
  if (input.name.trim().length < 2) {
    return "Nama karyawan minimal 2 karakter.";
  }

  if (input.phone.replace(/\D/g, "").length < 8) {
    return "Nomor HP minimal 8 digit.";
  }

  if (!isRole(input.role)) {
    return "Role karyawan tidak valid.";
  }

  if (!input.branch?.id || !input.branch.name) {
    return "Pilih cabang karyawan.";
  }

  return null;
}

async function ensureBranch(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  branch: Branch,
) {
  const { error } = await admin.from("branches").upsert(
    {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (error) throw new Error("Gagal menyiapkan cabang");
}

export async function inviteEmployeeAction(
  input: InviteEmployeeInput,
): Promise<InviteEmployeeResult> {
  const session = await getAuthorizedSession("canManageEmployees");
  if (!session) return { ok: false, error: NO_ACCESS };

  const validationError = validateEmployeeInput(input);
  if (validationError) return { ok: false, error: validationError };

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Format email tidak valid." };
  }

  const password = input.password;
  if (password.length < 8) {
    return { ok: false, error: "Password minimal 8 karakter." };
  }

  const name = input.name.trim();
  const phone = input.phone.trim();

  try {
    const admin = createSupabaseAdminClient();
    await ensureBranch(admin, input.branch);

    const { data: invited, error: inviteError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

    if (inviteError || !invited.user) {
      return {
        ok: false,
        error: "Akun gagal dibuat. Pastikan email belum terdaftar.",
      };
    }

    const employee = {
      id: `emp-${crypto.randomUUID()}`,
      user_id: invited.user.id,
      name,
      phone,
      initials: buildInitials(name),
      role: input.role,
      branch_id: input.branch.id,
      is_active: true,
    };

    const { error: insertError } = await admin
      .from("employees")
      .insert(employee);

    if (insertError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      return { ok: false, error: "Gagal menyimpan data karyawan." };
    }

    return {
      ok: true,
      employee: {
        id: employee.id,
        name: employee.name,
        phone: employee.phone,
        initials: employee.initials,
        role: employee.role,
        branchId: employee.branch_id,
        isActive: true,
      },
    };
  } catch {
    return { ok: false, error: FAILED };
  }
}

export async function updateEmployeeAccountAction(
  employeeId: string,
  input: EmployeeAccountInput,
): Promise<EmployeeAccountResult> {
  const session = await getAuthorizedSession("canManageEmployees");
  if (!session) return { ok: false, error: NO_ACCESS };

  const validationError = validateEmployeeInput(input);
  if (validationError) return { ok: false, error: validationError };

  try {
    const admin = createSupabaseAdminClient();
    await ensureBranch(admin, input.branch);

    const { error } = await admin
      .from("employees")
      .update({
        name: input.name.trim(),
        phone: input.phone.trim(),
        initials: buildInitials(input.name),
        role: input.role,
        branch_id: input.branch.id,
      })
      .eq("id", employeeId);

    if (error) return { ok: false, error: "Data akun gagal diperbarui." };

    return { ok: true };
  } catch {
    return { ok: false, error: FAILED };
  }
}

export async function setEmployeeAccountActiveAction(
  employeeId: string,
  isActive: boolean,
): Promise<EmployeeAccountResult> {
  const session = await getAuthorizedSession("canManageEmployees");
  if (!session) return { ok: false, error: NO_ACCESS };

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("employees")
      .select("id,role,is_active")
      .eq("id", employeeId)
      .maybeSingle();

    if (error) return { ok: false, error: FAILED };

    // Karyawan lama yang belum punya akun Auth cukup diubah di localStorage.
    if (!data) return { ok: true };

    if (!isActive && data.id === session.employee.id) {
      return { ok: false, error: "Tidak bisa menonaktifkan akun yang sedang dipakai." };
    }

    if (!isActive && data.role === "Owner") {
      const { count, error: countError } = await admin
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("role", "Owner")
        .eq("is_active", true);

      if (countError) return { ok: false, error: FAILED };
      if ((count ?? 0) <= 1) {
        return { ok: false, error: "Minimal harus ada satu Owner aktif." };
      }
    }

    const { error: updateError } = await admin
      .from("employees")
      .update({ is_active: isActive })
      .eq("id", employeeId);

    if (updateError) return { ok: false, error: FAILED };

    return { ok: true };
  } catch {
    return { ok: false, error: FAILED };
  }
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

export type RoleMatrixResult =
  | { ok: true; matrix: Record<Role, RolePermissions> }
  | { ok: false; error: string };

export async function fetchRolePermissionsAction(): Promise<RoleMatrixResult> {
  const session = await getAuthorizedSession("canManageEmployees");
  if (!session) return { ok: false, error: NO_ACCESS };

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("role_permissions")
      .select(
        "role,can_apply_discount,can_cancel_transaction,can_manage_products,can_create_sales_order,can_manage_sales_orders,can_delete_sales_order,can_export_reports,can_view_all_branches,can_view_all_attendance,can_approve_leave,can_manage_employees,can_manage_branches,can_manage_settings,can_use_cashier,can_view_products",
      );

    if (error) return { ok: false, error: FAILED };

    const matrix = { ...ROLE_PERMISSIONS };
    ((data ?? []) as RolePermissionsRow[]).forEach((row) => {
      if (isRole(row.role)) matrix[row.role] = mapPermissions(row);
    });

    // Owner selalu memegang seluruh akses dan tidak bisa dikurangi.
    matrix[ROLES.OWNER] = ROLE_PERMISSIONS[ROLES.OWNER];

    return { ok: true, matrix };
  } catch {
    return { ok: false, error: FAILED };
  }
}

export async function saveRolePermissionsAction(
  matrix: Record<Role, RolePermissions>,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageEmployees");
  if (!session) return { ok: false, error: NO_ACCESS };
  if (!session.isOwner) {
    return { ok: false, error: "Hanya Owner yang bisa mengubah hak akses role." };
  }

  const payload: Record<string, RolePermissions> = {};
  ALL_ROLES.filter((role) => role !== ROLES.OWNER).forEach((role) => {
    payload[role] = matrix[role];
  });

  const result = await callServiceRpc("fn_update_role_permissions_matrix", {
    p_payload: payload,
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function fetchEmployeeSnapshotAction(): Promise<Employee[]> {
  const session = await getAuthSession();
  if (!session) return [];

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("employees")
      .select("id,name,phone,initials,role,branch_id,is_active")
      .order("name");

    if (error) return [];

    return ((data ?? []) as {
      id: string;
      name: string;
      phone: string | null;
      initials: string;
      role: string;
      branch_id: string;
      is_active: boolean;
    }[])
      .filter((row) => isRole(row.role))
      .map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone ?? "",
        initials: row.initials,
        role: row.role as Employee["role"],
        branchId: row.branch_id,
        isActive: row.is_active,
      }));
  } catch {
    return [];
  }
}

export async function deleteEmployeeAccountAction(
  employeeId: string,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageEmployees");
  if (!session) return { ok: false, error: NO_ACCESS };
  if (!session.isOwner) {
    return { ok: false, error: "Hanya Owner yang bisa menghapus karyawan." };
  }
  if (employeeId === session.employee.id) {
    return { ok: false, error: "Tidak bisa menghapus akun yang sedang dipakai." };
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: employee, error } = await admin
      .from("employees")
      .select("id,user_id,name")
      .eq("id", employeeId)
      .maybeSingle();

    if (error || !employee) {
      return { ok: false, error: "Karyawan tidak ditemukan." };
    }

    const result = await callServiceRpc("fn_delete_employee", {
      p_id: employeeId,
    });

    if (!result.ok) return { ok: false, error: result.error };

    if (employee.user_id) {
      const { error: authError } = await admin.auth.admin.deleteUser(
        employee.user_id as string,
      );
      if (authError) {
        console.error("Akun Auth karyawan gagal dihapus:", authError.message);
      }
    }

    return { ok: true };
  } catch {
    return { ok: false, error: FAILED };
  }
}
