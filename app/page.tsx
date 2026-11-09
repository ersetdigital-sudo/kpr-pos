import { redirect } from "next/navigation";
import { getFirstAccessiblePath } from "@/config/navigation";
import { getReadSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getReadSession();

  if (!session) {
    redirect("/login");
  }

  redirect(getFirstAccessiblePath(session.permissions) ?? "/dashboard");
}
