"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import { formatDateLong, formatDateTimeLong, formatRupiah } from "@/lib/format";
import {
  buildStageStates,
  isKasbonOverdue,
  repaymentLabel,
} from "@/features/kasbon/data/kasbon-calculations";
import { KasbonStatusBadge } from "@/features/kasbon/components/KasbonStatusBadge";
import type {
  KasbonRow,
  KasbonStepState,
} from "@/features/kasbon/types";

const STEP_LABELS: Record<KasbonStepState, string> = {
  selesai: "Disetujui",
  berjalan: "Menunggu",
  menunggu: "Belum diproses",
  ditolak: "Ditolak",
};

const STEP_TONES: Record<KasbonStepState, BadgeTone> = {
  selesai: "success",
  berjalan: "warning",
  menunggu: "neutral",
  ditolak: "danger",
};

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-meta text-ink-muted">{label}</dt>
      <dd className="m-0 text-label font-semibold text-ink">{value}</dd>
    </div>
  );
}

interface KasbonDetailDialogProps {
  row: KasbonRow;
  today: string;
  onPrint: () => void;
  onClose: () => void;
}

/** Detail lengkap satu kasbon: nominal, metode, jejak persetujuan, pelunasan. */
export function KasbonDetailDialog({
  row,
  today,
  onPrint,
  onClose,
}: KasbonDetailDialogProps) {
  const steps = buildStageStates(row);
  const rejectedApproval = row.approvals.find(
    (approval) => approval.decision === "Ditolak",
  );
  const rejectionReason = row.rejectionReason || rejectedApproval?.note || "";
  const overdue = isKasbonOverdue(row, today);

  return (
    <Modal
      open
      onClose={onClose}
      title="Detail kasbon"
      description={`${row.employeeName} · ${row.branchName}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button variant="primary" onClick={onPrint}>
            Cetak detail
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-control bg-canvas px-3.5 py-3">
          <div>
            <p className="m-0 text-meta text-ink-muted">Nominal kasbon</p>
            <p className="m-0 text-page-title font-extrabold text-ink">
              {formatRupiah(row.amount)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <KasbonStatusBadge status={row.status} />
            {overdue ? (
              <span className="inline-flex items-center rounded-pill bg-danger-soft px-2 py-[3px] text-meta font-semibold text-danger-ink">
                Lewat jatuh tempo
              </span>
            ) : null}
          </div>
        </div>

        <dl className="m-0 grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <InfoItem label="Karyawan" value={row.employeeName} />
          <InfoItem label="Cabang" value={row.branchName} />
          <InfoItem label="Metode pelunasan" value={repaymentLabel(row)} />
          <InfoItem
            label="Tanggal pengajuan"
            value={formatDateTimeLong(row.createdAt)}
          />
          <InfoItem
            label="Disetujui Owner"
            value={
              row.approvedAt ? formatDateTimeLong(row.approvedAt) : "Belum disetujui"
            }
          />
          <InfoItem
            label="Jatuh tempo"
            value={
              row.repaymentMethod === "tempo"
                ? row.dueDate
                  ? formatDateLong(row.dueDate)
                  : "Dihitung saat Owner menyetujui"
                : "Tidak ada (potong gaji)"
            }
          />
          <InfoItem
            label="Tanggal pelunasan"
            value={row.settledAt ? formatDateTimeLong(row.settledAt) : "Belum lunas"}
          />
          <InfoItem
            label="Petugas pelunasan"
            value={row.settledAt ? row.settledByName || "—" : "—"}
          />
        </dl>

        <section>
          <h3 className="m-0 mb-1.5 text-label font-bold text-ink">Alasan</h3>
          <p className="m-0 whitespace-pre-line rounded-control bg-canvas px-3.5 py-2.5 text-label text-ink-soft">
            {row.reason}
          </p>
        </section>

        <section>
          <h3 className="m-0 mb-2 text-label font-bold text-ink">
            Jejak persetujuan
          </h3>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {steps.map((step) => (
              <li
                key={step.stage}
                className="rounded-control border border-line bg-surface px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-label font-semibold text-ink">
                    Tahap {step.stage}
                  </span>
                  <StatusBadge tone={STEP_TONES[step.state]}>
                    {STEP_LABELS[step.state]}
                  </StatusBadge>
                </div>

                {step.approval ? (
                  <>
                    <p className="m-0 mt-1.5 text-meta text-ink">
                      {step.approval.decidedByName || "—"} ·{" "}
                      {formatDateTimeLong(step.approval.decidedAt)}
                    </p>
                    <p className="m-0 mt-0.5 text-meta text-ink-muted">
                      Catatan: {step.approval.note || "—"}
                    </p>
                  </>
                ) : (
                  <p className="m-0 mt-1.5 text-meta text-ink-muted">
                    {step.state === "berjalan"
                      ? "Menunggu keputusan"
                      : "Belum diproses"}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>

        {row.status === "Ditolak" ? (
          <section className="rounded-control bg-danger-soft px-3.5 py-3">
            <h3 className="m-0 mb-1 text-label font-bold text-danger-ink">
              Alasan penolakan
            </h3>
            <p className="m-0 text-label text-danger-ink">
              {rejectionReason || "Tidak ada catatan penolakan."}
            </p>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
