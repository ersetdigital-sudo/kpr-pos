import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { getAuthSession } from "@/lib/auth/session";
import { LoginForm } from "@/app/login/login-form";

export const instant = false;

export const metadata = {
  title: "Masuk",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await connection();
  const session = await getAuthSession();
  if (session) redirect("/dashboard");

  const params = await searchParams;
  const initialError =
    params.error === "auth"
      ? "Tautan tidak valid atau sudah kedaluwarsa."
      : undefined;

  return (
    <AuthShell
      title="Masuk ke POS"
      description="Gunakan email dan password akun karyawan Anda."
    >
      <LoginForm initialError={initialError} />
    </AuthShell>
  );
}
