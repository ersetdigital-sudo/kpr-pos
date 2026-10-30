"use client";

import { Button } from "@/components/ui/Button";
import { usePermissions } from "@/features/session/data/session-repository";

export function ProductPageActions() {
  const { canManageProducts } = usePermissions();

  if (!canManageProducts) return null;

  return (
    <>
      <Button variant="outline" size="md">
        Import Excel
      </Button>
      <Button variant="primary" size="md" className="px-4">
        + Tambah Produk
      </Button>
    </>
  );
}
