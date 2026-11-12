"use client";

import { createPortal } from "react-dom";
import {
  formatDateShort,
  formatDateTimeLong,
  formatDateTimeShort,
  formatRupiah,
} from "@/lib/format";
import { KasbonPrintLetterhead } from "@/features/kasbon/components/KasbonPrintLetterhead";
import type { BusinessProfile } from "@/lib/store/types";
import type { KasbonRecapData } from "@/features/kasbon/types";

interface KasbonRecapPrintSheetProps {
  data: KasbonRecapData;
  business: BusinessProfile;
  printedBy: string;
}

/** Versi cetak rekap kasbon; dipakai tombol Export PDF dan Cetak. */
export function KasbonRecapPrintSheet({
  data,
  business,
  printedBy,
}: KasbonRecapPrintSheetProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div id="kasbon-print-root" className="hidden" aria-hidden="true">
      <div className="report-paper bg-white px-6 py-6 text-ink">
        <KasbonPrintLetterhead
          business={business}
          title="Rekap Kasbon"
          subtitle={data.labels.period}
        />

        <table className="mt-3 w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className="py-0.5 pr-3 text-ink-muted">Cabang</td>
              <td className="py-0.5 pr-6 font-semibold">{data.labels.branch}</td>
              <td className="py-0.5 pr-3 text-ink-muted">Status</td>
              <td className="py-0.5 font-semibold">{data.labels.status}</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-3 text-ink-muted">Karyawan</td>
              <td className="py-0.5 pr-6 font-semibold">
                {data.labels.employee}
              </td>
              <td className="py-0.5 pr-3 text-ink-muted">Jumlah</td>
              <td className="py-0.5 font-semibold">
                {data.rows.length} kasbon · {data.employees.length} karyawan
              </td>
            </tr>
          </tbody>
        </table>

        <section className="mt-4">
          <h2 className="m-0 mb-1.5 text-[12px] font-bold">Ringkasan</h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-ink/30 text-left text-ink-muted">
                <th className="py-1 font-semibold">Metrik</th>
                <th className="py-1 text-right font-semibold">Jumlah Kasbon</th>
                <th className="py-1 text-right font-semibold">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line">
                <td className="py-1 font-semibold">Total diajukan</td>
                <td className="py-1 text-right">{data.stats.requested.count}</td>
                <td className="py-1 text-right">
                  {formatRupiah(data.stats.requested.amount)}
                </td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-1 font-semibold">Total disetujui</td>
                <td className="py-1 text-right">{data.stats.approved.count}</td>
                <td className="py-1 text-right">
                  {formatRupiah(data.stats.approved.amount)}
                </td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-1 font-semibold">Total lunas</td>
                <td className="py-1 text-right">{data.stats.settled.count}</td>
                <td className="py-1 text-right">
                  {formatRupiah(data.stats.settled.amount)}
                </td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-1 font-semibold">Total belum lunas</td>
                <td className="py-1 text-right">
                  {data.stats.outstanding.count}
                </td>
                <td className="py-1 text-right">
                  {formatRupiah(data.stats.outstanding.amount)}
                </td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-1 font-semibold">Ditolak</td>
                <td className="py-1 text-right">{data.stats.rejected.count}</td>
                <td className="py-1 text-right">
                  {formatRupiah(data.stats.rejected.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-4">
          <h2 className="m-0 mb-1.5 text-[12px] font-bold">
            Rekap per Karyawan
          </h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-ink/30 text-left text-ink-muted">
                <th className="py-1 font-semibold">Karyawan</th>
                <th className="py-1 font-semibold">Cabang</th>
                <th className="py-1 text-right font-semibold">Jumlah</th>
                <th className="py-1 text-right font-semibold">Total Nominal</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.length === 0 ? (
                <tr>
                  <td className="py-1 text-ink-muted" colSpan={4}>
                    Belum ada kasbon pada filter ini
                  </td>
                </tr>
              ) : null}
              {data.employees.map((group) => (
                <tr key={group.employeeId} className="border-t border-line">
                  <td className="py-1 font-semibold">{group.employeeName}</td>
                  <td className="py-1">{group.branchName}</td>
                  <td className="py-1 text-right">{group.count}</td>
                  <td className="py-1 text-right">
                    {formatRupiah(group.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-4">
          <h2 className="m-0 mb-1.5 text-[12px] font-bold">
            Rincian per Kasbon
          </h2>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-ink/30 text-left text-ink-muted">
                <th className="py-1 font-semibold">Karyawan</th>
                <th className="py-1 font-semibold">Tanggal</th>
                <th className="py-1 text-right font-semibold">Nominal</th>
                <th className="py-1 font-semibold">Metode</th>
                <th className="py-1 font-semibold">Status</th>
                <th className="py-1 font-semibold">Jatuh Tempo</th>
                <th className="py-1 font-semibold">Alasan</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td className="py-1 text-ink-muted" colSpan={7}>
                    Belum ada kasbon pada filter ini
                  </td>
                </tr>
              ) : null}
              {data.rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-1 font-semibold">{row.employeeName}</td>
                  <td className="py-1 whitespace-nowrap">
                    {formatDateTimeShort(row.createdAt)}
                  </td>
                  <td className="py-1 text-right whitespace-nowrap">
                    {formatRupiah(row.amount)}
                  </td>
                  <td className="py-1">
                    {row.repaymentMethod === "tempo"
                      ? `Tempo ${row.tempoValue ?? 0} ${row.tempoUnit ?? "hari"}`
                      : "Potong gaji"}
                  </td>
                  <td className="py-1">{row.status}</td>
                  <td className="py-1 whitespace-nowrap">
                    {row.dueDate ? formatDateShort(row.dueDate) : "-"}
                  </td>
                  <td className="py-1">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="mt-6 border-t border-ink/30 pt-2 text-[10px] text-ink-muted">
          Dicetak {formatDateTimeLong(new Date())} oleh {printedBy} ·{" "}
          {business.name} · Periode {data.labels.period}
        </div>
      </div>
    </div>,
    document.body,
  );
}
