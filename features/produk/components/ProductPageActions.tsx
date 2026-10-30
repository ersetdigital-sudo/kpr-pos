"use client";

import { Button } from "@/components/ui/Button";

interface ProductPageActionsProps {
  canManage: boolean;
  onImport: () => void;
  onCreate: () => void;
}

export function ProductPageActions({
  canManage,
  onImport,
  onCreate,
}: ProductPageActionsProps) {
  if (!canManage) return null;

  return (
    <>
      <Button variant="outline" size="md" onClick={onImport}>
        Import Excel
      </Button>
      <Button
        variant="primary"
        size="md"
        className="px-4"
        onClick={onCreate}
      >
        + Tambah Produk
      </Button>
    </>
  );
}
