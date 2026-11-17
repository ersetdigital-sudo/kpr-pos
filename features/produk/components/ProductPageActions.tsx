"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

interface ProductPageActionsProps {
  canManage: boolean;
  exporting: boolean;
  onExport: () => void;
  onPrint: () => void;
  onImport: () => void;
  onCreate: () => void;
}

export function ProductPageActions({
  canManage,
  exporting,
  onExport,
  onPrint,
  onImport,
  onCreate,
}: ProductPageActionsProps) {
  return (
    <>
      <Button
        variant="outline"
        size="md"
        onClick={onExport}
        disabled={exporting}
      >
        <Icon name="download" size={16} />
        {exporting ? "Menyiapkan…" : "Ekspor daftar"}
      </Button>
      <Button variant="outline" size="md" onClick={onPrint}>
        <Icon name="print" size={16} />
        Cetak daftar
      </Button>
      {canManage ? (
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
      ) : null}
    </>
  );
}
