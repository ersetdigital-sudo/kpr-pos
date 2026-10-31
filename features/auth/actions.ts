"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

    revalidatePath("/", "layout");
  } catch {
    return { error: "Login gagal. Coba lagi." };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
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

    revalidatePath("/", "layout");
  } catch {
    return { error: "Password gagal disimpan. Coba lagi." };
  }

  redirect("/dashboard");
}
