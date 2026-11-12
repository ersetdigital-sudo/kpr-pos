"use client";

import { createPortal } from "react-dom";
import {
  formatDateLong,
  formatDateTimeLong,
  formatRupiah,
} from "@/lib/format";
import { repaymentLabel } from "@/features/kasbon/data/kasbon-calculations";
import { KasbonPrintLetterhead } from "@/features/kasbon/components/KasbonPrintLetterhead";
import type { BusinessProfile } from "@/lib/store/types";
import type { KasbonRow } from "@/features/kasbon/types";

interface KasbonDetailPrintSheetProps {
  row: KasbonRow;
  business: BusinessProfile;
  printedBy: string;
}

/** Cetak detail satu kasbon; hanya berisi data kasbon yang sedang dibuka. */
export function KasbonDetailPrintSheet({
  row,
  business,
  printedBy,
}: KasbonDetailPrintSheetProps) {
  if (typeof document === "undefined") return null;

  const rejected = row.approvals.find(
    (approval) => approval.decision === "Ditolak",
  );
  const rejectionReason = row.rejectionReason || rejected?.note || "";

  return createPortal(
    <div id="kasbon-print-root" className="hidden" aria-hidden="true">
      <div className="report-paper bg-white px-6 py-6 text-ink">
        <KasbonPrintLetterhead
          business={business}
          title="Detail Kasbon"
          subtitle={`${row.employeeName} · ${formatDateTimeLong(row.createdAt)}`}
        />

        <table className="mt-4 w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className="w-32 py-1 text-ink-muted">Karyawan</td>
              <td className="py-1 pr-6 font-semibold">{row.employeeName}</td>
              <td className="w-32 py-1 text-ink-muted">Cabang</td>
              <td className="py-1 font-semibold">{row.branchName}</td>
            </tr>
            <tr className="border-t border-line">
              <td className="py-1 text-ink-muted">Nominal</td>
              <td className="py-1 pr-6 font-semibold">
                {formatRupiah(row.amount)}
              </td>
              <td className="py-1 text-ink-muted">Status</td>
              <td className="py-1 font-semibold">{row.status}</td>
            </tr>
            <tr className="border-t border-line">
              <td className="py-1 text-ink-muted">Metode pelunasan</td>
              <td className="py-1 pr-6">{repaymentLabel(row)}</td>
              <td className="py-1 text-ink-muted">Jatuh tempo</td>
              <td className="py-1">
                {row.repaymentMethod === "tempo"
                  ? row.dueDate
                    ? formatDateLong(row.dueDate)
                    : "Dihitung saat Owner menyetujui"
                  : "-"}
              </td>
            </tr>
            <tr className="border-t border-line">
              <td className="py-1 text-ink-muted">Disetujui Owner</td>
              <td className="py-1 pr-6">
                {row.approvedAt ? formatDateTimeLong(row.approvedAt) : "-"}
              </td>
              <td className="py-1 text-ink-muted">Tanggal pelunasan</td>
              <td className="py-1">
                {row.settledAt ? formatDateTimeLong(row.settledAt) : "Belum lunas"}
              </td>
            </tr>
            <tr className="border-t border-line">
              <td className="py-1 text-ink-muted">Petugas pelunasan</td>
              <td className="py-1 pr-6" colSpan={3}>
                {row.settledAt ? row.settledByName || "-" : "-"}
              </td>
            </tr>
            <tr className="border-t border-line">
              <td className="py-1 align-top text-ink-muted">Alasan</td>
              <td className="py-1" colSpan={3}>
                {row.reason}
              </td>
            </tr>
          </tbody>
        </table>

        <section className="mt-5">
          <h2 className="m-0 mb-1.5 text-[12px] font-bold">
            Jejak Persetujuan
          </h2>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-ink/30 text-left text-ink-muted">
                <th className="py-1 font-semibold">Tahap</th>
                <th className="py-1 font-semibold">Keputusan</th>
                <th className="py-1 font-semibold">Oleh</th>
                <th className="py-1 font-semibold">Waktu</th>
                <th className="py-1 font-semibold">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {row.approvals.length === 0 ? (
                <tr>
                  <td className="py-1 text-ink-muted" colSpan={5}>
                    Belum ada keputusan persetujuan
                  </td>
                </tr>
              ) : null}
              {row.approvals.map((approval) => (
                <tr key={approval.id} className="border-t border-line">
                  <td className="py-1 font-semibold">{approval.stage}</td>
                  <td className="py-1">{approval.decision}</td>
                  <td className="py-1">{approval.decidedByName || "-"}</td>
                  <td className="py-1 whitespace-nowrap">
                    {formatDateTimeLong(approval.decidedAt)}
                  </td>
                  <td className="py-1">{approval.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {row.status === "Ditolak" ? (
          <section className="mt-5">
            <h2 className="m-0 mb-1 text-[12px] font-bold">
              Alasan Penolakan
            </h2>
            <p className="m-0 text-[11px]">
              {rejectionReason || "Tidak ada catatan penolakan."}
            </p>
          </section>
        ) : null}

        <div className="mt-6 border-t border-ink/30 pt-2 text-[10px] text-ink-muted">
          Dicetak {formatDateTimeLong(new Date())} oleh {printedBy} ·{" "}
          {business.name}
        </div>
      </div>
    </div>,
    document.body,
  );
}
