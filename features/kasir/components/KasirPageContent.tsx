"use client";

import { KasirWorkspace } from "@/features/kasir/components/KasirWorkspace";
import { useSession } from "@/features/session/data/session-repository";

export function KasirPageContent() {
  const { employee, branch } = useSession();

  // Ganti user/cabang me-remount workspace supaya keranjang tidak tercampur.
  return <KasirWorkspace key={`${employee.id}:${branch.id}`} />;
}
