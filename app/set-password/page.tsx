import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { getAuthSession } from "@/lib/auth/session";
import { SetPasswordForm } from "@/app/set-password/set-password-form";

export const instant = false;

export const metadata = {
  title: "Buat Password",
};

export default async function SetPasswordPage() {
  await connection();
  const session = await getAuthSession();
  if (!session) redirect("/login");

  return (
    <AuthShell
      title="Buat Password"
      description="Akun Anda sudah aktif. Buat password untuk masuk berikutnya."
    >
      <SetPasswordForm />
    </AuthShell>
  );
}
