"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { resetDemoData } from "@/features/pengaturan/data/pengaturan-repository";

export function ResetDataCard() {
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleReset() {
    try {
      resetDemoData();
      showToast("Data demo dikembalikan ke data awal", "success");
    } catch {
      showToast("Reset data gagal, coba lagi", "error");
    } finally {
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <Card className="flex flex-col gap-3 p-5">
        <div>
          <h2 className="m-0 text-card-title font-bold text-ink">
            Reset Data Demo
          </h2>
          <p className="mt-0.5 mb-0 text-label text-ink-muted">
            Mengembalikan seluruh data (transaksi, stok, karyawan, pengaturan)
            ke data awal. Tindakan ini tidak bisa dibatalkan.
          </p>
        </div>

        <div className="rounded-control bg-danger-soft px-3 py-2.5 text-label text-danger-ink">
          Semua perubahan yang sudah dibuat akan hilang dan diganti data contoh.
        </div>

        <div className="flex justify-end">
          <Button
            variant="dangerOutline"
            size="md"
            onClick={() => setConfirmOpen(true)}
          >
            Reset Data
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Reset semua data?"
        description="Seluruh transaksi, stok, karyawan, dan pengaturan akan dikembalikan ke data demo awal. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, reset data"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleReset}
      />
    </>
  );
}
