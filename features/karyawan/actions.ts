"use server";

import { ALL_ROLES, type Role } from "@/constants/roles";
import { getAuthorizedSession } from "@/lib/auth/session";
import { buildInitials } from "@/lib/initials";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Branch } from "@/lib/store/types";
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
