"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { CustomerRecapRow } from "@/features/pelanggan/types";

interface CustomerMergeDialogProps {
  source: CustomerRecapRow;
  targets: readonly CustomerRecapRow[];
  saving: boolean;
  onClose: () => void;
  onConfirm: (targetId: string) => void;
}

export function CustomerMergeDialog({
  source,
  targets,
  saving,
  onClose,
  onConfirm,
}: CustomerMergeDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [targetId, setTargetId] = useState("");
  const target = targets.find((row) => row.id === targetId) ?? null;
  const tempoConflict =
    source.activeTempo && target !== null && target.activeTempo;

  function handleClose() {
    if (!saving) onClose();
  }

  const footer =
    step === 1 ? (
      <>
        <Button variant="outline" onClick={handleClose} disabled={saving}>
          Batal
        </Button>
        <Button
          variant="primary"
          onClick={() => setStep(2)}
          disabled={!target || tempoConflict}
        >
          Lanjut
        </Button>
      </>
    ) : (
      <>
        <Button
          variant="outline"
          onClick={() => setStep(1)}
          disabled={saving}
        >
          Kembali
        </Button>
        <Button
          variant="danger"
          onClick={() => target && onConfirm(target.id)}
          disabled={saving || !target || tempoConflict}
        >
          {saving ? "Menggabungkan…" : "Ya, gabungkan permanen"}
        </Button>
      </>
    );

  return (
    <Modal
      open
      onClose={handleClose}
      title="Gabungkan pelanggan ganda"
      description="Seluruh riwayat dipindah ke pelanggan target, lalu data ganda dihapus."
      size="md"
      footer={footer}
    >
      {step === 1 ? (
        <div className="flex flex-col gap-3.5">
          <div className="rounded-control border border-line bg-canvas px-3 py-2.5">
            <p className="m-0 text-meta text-ink-muted">
              Pelanggan yang digabung
            </p>
            <p className="m-0 mt-0.5 text-body font-semibold text-ink">
              {source.name}
            </p>
            <p className="m-0 mt-0.5 text-meta text-ink-muted">
              {source.phone || "Tanpa no. HP"} ·{" "}
              {formatNumber(source.historyCount)} pesanan riwayat ·{" "}
              {formatNumber(source.activeCreditCount)} tagihan berjalan ·{" "}
              {formatRupiah(source.totalSpending)} belanja periode ini
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-label font-semibold text-ink">
              Pelanggan target
            </span>
            <Select
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              disabled={saving}
            >
              <option value="">Pilih pelanggan target…</option>
              {targets.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                  {row.phone ? ` · ${row.phone}` : ""}
                </option>
              ))}
            </Select>
          </label>

          {targets.length === 0 ? (
            <p className="m-0 text-label text-danger-ink">
              Belum ada pelanggan lain yang bisa menjadi target.
            </p>
          ) : null}

          {tempoConflict ? (
            <p className="m-0 rounded-control border border-danger-line bg-danger-soft px-3 py-2 text-label text-danger-ink">
              Kedua pelanggan punya tempo aktif. Lunasi atau batalkan salah
              satu tempo dulu sebelum menggabungkan.
            </p>
          ) : null}

          <p className="m-0 text-meta text-ink-muted">
            Pesanan lama yang hanya tercatat dengan nama pelanggan ini ikut
            dipindahkan. Tindakan ini tidak bisa dibatalkan.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-body text-ink">
            Gabungkan{" "}
            <span className="font-bold">“{source.name}”</span> ke{" "}
            <span className="font-bold">“{target?.name ?? ""}”</span>?
          </p>
          <ul className="m-0 list-disc pl-5 text-label text-ink-soft">
            <li>
              {formatNumber(source.historyCount)} pesanan/transaksi dipindah ke
              pelanggan target.
            </li>
            <li>
              {formatNumber(source.activeCreditCount)} tagihan COD/Tempo
              berjalan ikut pindah.
            </li>
            <li>Data pelanggan sumber dihapus setelah riwayatnya dipindah.</li>
            <li>Tindakan ini tidak bisa dibatalkan.</li>
          </ul>
        </div>
      )}
    </Modal>
  );
}
