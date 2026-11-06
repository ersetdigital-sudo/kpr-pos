import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { AuthSessionProvider } from "@/features/session/data/session-context";
import { AppSyncProvider } from "@/features/sync/data/AppSyncProvider";
import { readAppSnapshot } from "@/features/sync/data/app-snapshot";
import { getAuthSession } from "@/lib/auth/session";

export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  await connection();
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  // Satu snapshot untuk render pertama: tidak ada enam action berurutan.
  const snapshot = await readAppSnapshot(session);

  return (
    <AuthSessionProvider session={session}>
      <AppSyncProvider initialSnapshot={snapshot}>
        <AppShell>{children}</AppShell>
      </AppSyncProvider>
    </AuthSessionProvider>
  );
}
