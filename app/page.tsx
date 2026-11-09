import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getFirstAccessiblePath } from "@/config/navigation";
import { getReadSession } from "@/lib/auth/session";

export const instant = false;

export default async function HomePage() {
  await connection();

  const session = await getReadSession();

  if (!session) {
    redirect("/login");
  }

  redirect(getFirstAccessiblePath(session.permissions) ?? "/dashboard");
}
