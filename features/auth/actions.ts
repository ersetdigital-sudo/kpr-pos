"use server";

import { redirect } from "next/navigation";
import { getFirstAccessiblePath } from "@/config/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LoginState, SetPasswordState } from "@/features/auth/types";

const LOGIN_ERROR = "Email atau password salah.";

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return { error: LOGIN_ERROR };
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("id,is_active")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!employee || !employee.is_active) {
      await supabase.auth.signOut();
      return { error: LOGIN_ERROR };
    }
  } catch {
    return { error: "Login gagal. Coba lagi." };
  }

  const session = await getAuthSession();
  redirect(
    (session ? getFirstAccessiblePath(session.permissions) : null) ??
      "/dashboard",
  );
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Ganti password dari dalam aplikasi tanpa memaksa login ulang. */
export async function changeOwnPasswordAction(
  _previous: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (!currentPassword) {
    return { error: "Masukkan password saat ini." };
  }

  if (password.length < 8) {
    return { error: "Password baru minimal 8 karakter." };
  }

  if (password !== confirmation) {
    return { error: "Konfirmasi password tidak sama." };
  }

  if (password === currentPassword) {
    return { error: "Password baru harus berbeda dari password lama." };
  }

  const session = await getAuthSession();
  if (!session) {
    return { error: "Sesi tidak ditemukan. Silakan masuk kembali." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return { error: "Akun tidak ditemukan. Silakan masuk kembali." };
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return { error: "Password saat ini salah." };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { error: "Password gagal disimpan. Coba lagi." };
    }
  } catch {
    return { error: "Password gagal disimpan. Coba lagi." };
  }

  return { success: true };
}

export async function updatePasswordAction(
  _previous: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password.length < 8) {
    return { error: "Password minimal 8 karakter." };
  }

  if (password !== confirmation) {
    return { error: "Konfirmasi password tidak sama." };
  }

  const session = await getAuthSession();

  if (!session) {
    return { error: "Sesi tidak ditemukan. Silakan masuk kembali." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { error: "Password gagal disimpan. Coba lagi." };
    }
  } catch {
    return { error: "Password gagal disimpan. Coba lagi." };
  }

  redirect("/dashboard");
}
