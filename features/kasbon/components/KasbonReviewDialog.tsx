"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { formatRupiah } from "@/lib/format";
import type {
  KasbonDecision,
  KasbonRow,
  KasbonStage,
} from "@/features/kasbon/types";

interface KasbonReviewDialogProps {
  row: KasbonRow;
  stage: KasbonStage;
  decision: KasbonDecision;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

/** Dialog setujui/tolak satu tahap; alasan wajib saat menolak. */
export function KasbonReviewDialog({
  row,
  stage,
  decision,
  submitting,
  onClose,
  onConfirm,
}: KasbonReviewDialogProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const isReject = decision === "Ditolak";

  function handleConfirm() {
    if (submitting) return;

    if (isReject && note.trim().length < 3) {
      setError("Alasan penolakan wajib diisi minimal 3 karakter.");
      return;
    }

    onConfirm(note);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isReject ? "Tolak kasbon" : "Setujui kasbon"}
      description={`${row.employeeName} · ${formatRupiah(row.amount)} · tahap ${stage}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant={isReject ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting
              ? "Memproses…"
              : isReject
                ? "Tolak kasbon"
                : `Setujui tahap ${stage}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="m-0 text-label text-ink-soft">
          {isReject
            ? "Penolakan langsung menghentikan pengajuan ini."
            : stage === "Owner"
              ? "Persetujuan Owner mengaktifkan kasbon dan mencatat pengeluaran di Buku Kas."
              : "Kasbon lanjut ke tahap berikutnya setelah disetujui."}
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-label font-semibold text-ink-soft">
            {isReject ? "Alasan penolakan" : "Catatan (opsional)"}
          </span>
          <Textarea
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              if (error) setError("");
            }}
            rows={3}
            maxLength={200}
            disabled={submitting}
            placeholder={
              isReject
                ? "Contoh: nominal melebihi plafon kasbon"
                : "Contoh: disetujui, potong gaji bulan depan"
            }
          />
        </label>

        {error ? (
          <p className="m-0 rounded-control bg-danger-soft px-3 py-2 text-label font-semibold text-danger-ink">
            {error}
          </p>
        ) : null}

        <p className="m-0 text-meta text-ink-muted">
          Keputusan tercatat di kasbon dan Log Aktivitas.
        </p>
      </div>
    </Modal>
  );
}
