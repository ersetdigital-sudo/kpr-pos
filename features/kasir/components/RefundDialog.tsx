"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { formatDateTimeShort, formatRupiah } from "@/lib/format";
import type { TransactionHistoryRow } from "@/features/kasir/types";

interface RefundDialogProps {
  row: TransactionHistoryRow;
  branchName: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/** Dialog konfirmasi refund; alasan wajib agar jejaknya jelas di Log Aktivitas. */
export function RefundDialog({
  row,
  branchName,
  onClose,
  onConfirm,
}: RefundDialogProps) {
  const [reason, setReason] = useState("");
  const isValid = reason.trim().length >= 3;

  return (
    <Modal
      open
      onClose={onClose}
      title="Refund transaksi?"
      description="Transaksi dibatalkan, uang dikembalikan, dan stok masuk lagi ke cabang."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="danger"
            disabled={!isValid}
            onClick={() => onConfirm(reason.trim())}
            className="disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ya, refund
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-control border border-line bg-canvas px-3 py-2.5 text-label">
          <div className="flex justify-between gap-3">
            <span className="text-ink-muted">No. Struk</span>
            <span className="font-semibold text-ink">{row.invoiceNumber}</span>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <span className="text-ink-muted">Waktu</span>
            <span className="text-ink">{formatDateTimeShort(row.createdAt)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <span className="text-ink-muted">Kasir</span>
            <span className="text-ink">{row.cashierName}</span>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <span className="text-ink-muted">Nominal refund</span>
            <span className="font-bold text-ink">{formatRupiah(row.total)}</span>
          </div>
        </div>

        <p className="m-0 rounded-control border border-danger-line bg-danger-soft px-3 py-2 text-meta text-danger-ink">
          {row.itemCount} pcs akan dikembalikan ke stok {branchName}. Tindakan
          ini tidak bisa dibatalkan.
        </p>

        <Field label="Alasan pembatalan" labelSize="sm">
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={160}
            placeholder="Contoh: salah input produk / pelanggan membatalkan"
            aria-label="Alasan pembatalan"
          />
        </Field>
        <p className="m-0 text-meta text-ink-muted">
          Minimal 3 karakter. Alasan ikut tersimpan di Log Aktivitas.
        </p>
      </div>
    </Modal>
  );
}
