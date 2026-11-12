"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatRupiah } from "@/lib/format";
import type { KasbonRow } from "@/features/kasbon/types";

interface KasbonSettleDialogProps {
  row: KasbonRow;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Konfirmasi tandai lunas beserta efeknya ke Buku Kas. */
export function KasbonSettleDialog({
  row,
  submitting,
  onClose,
  onConfirm,
}: KasbonSettleDialogProps) {
  const isTempo = row.repaymentMethod === "tempo";

  return (
    <Modal
      open
      onClose={onClose}
      title="Tandai kasbon lunas?"
      description={`${row.employeeName} · ${formatRupiah(row.amount)}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Memproses…" : "Tandai lunas"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="m-0 text-label text-ink-soft">
          {isTempo
            ? `Pemasukan ${formatRupiah(row.amount)} akan dicatat otomatis di Buku Kas cabang ${row.branchName} dengan kategori "Pelunasan kasbon".`
            : "Metode potong gaji: kasbon hanya diubah menjadi Lunas, tanpa catatan di Buku Kas."}
        </p>
        <p className="m-0 text-meta text-ink-muted">
          Aksi ini idempotent; menandai lunas dua kali tidak menggandakan
          catatan Buku Kas.
        </p>
      </div>
    </Modal>
  );
}
