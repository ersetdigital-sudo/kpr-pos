import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { ProductStockSyncProvider } from "@/features/produk/data/ProductStockSyncProvider";
import { SettingsBranchSyncProvider } from "@/features/pengaturan/data/SettingsBranchSyncProvider";
import { AuthSessionProvider } from "@/features/session/data/session-context";
import { getAuthSession } from "@/lib/auth/session";

export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  await connection();
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AuthSessionProvider session={session}>
      <ProductStockSyncProvider>
        <SettingsBranchSyncProvider>
          <AppShell>{children}</AppShell>
        </SettingsBranchSyncProvider>
      </ProductStockSyncProvider>
    </AuthSessionProvider>
  );
}
