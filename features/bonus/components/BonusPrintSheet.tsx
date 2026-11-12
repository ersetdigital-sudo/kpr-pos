"use client";

import { createPortal } from "react-dom";
import { formatDateTimeShort, formatNumber, formatRupiah } from "@/lib/format";
import type { BusinessProfile } from "@/lib/store/types";
import type {
  BonusMonthReport,
  BonusYearReport,
} from "@/features/bonus/types";

interface BonusPrintSheetProps {
  month: BonusMonthReport;
  year: BonusYearReport;
  business: BusinessProfile;
}

/** Versi cetak rekap bonus; dipakai tombol Cetak lewat window.print. */
export function BonusPrintSheet({
  month,
  year,
  business,
}: BonusPrintSheetProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div id="report-print-root" className="hidden" aria-hidden="true">
      <div className="report-paper bg-white px-6 py-6 text-ink">
        <div className="border-b border-ink/30 pb-3">
          <div className="text-[15px] font-bold">{business.name}</div>
          <div className="text-[11px]">{business.address}</div>
          <div className="text-[11px]">{business.phone}</div>
          <div className="mt-2 text-[18px] font-extrabold">
            Rekap Bonus Sales
          </div>
          <div className="text-[11px]">
            {month.monthLabel} · {month.ruleLabel}
          </div>
        </div>

        <section className="mt-4">
          <h2 className="m-0 mb-1.5 text-[12px] font-bold">Per Sales</h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-ink/30 text-left text-ink-muted">
                <th className="py-1 font-semibold">Sales</th>
                <th className="py-1 text-right font-semibold">Transaksi</th>
                <th className="py-1 text-right font-semibold">Pcs</th>
                <th className="py-1 text-right font-semibold">Nominal</th>
                <th className="py-1 text-right font-semibold">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {month.entries.length === 0 ? (
                <tr>
                  <td className="py-1 text-ink-muted" colSpan={5}>
                    Belum ada pesanan lunas pada periode ini
                  </td>
                </tr>
              ) : null}
              {month.entries.map((entry) => (
                <tr key={entry.salesEmployeeId} className="border-t border-line">
                  <td className="py-1 font-semibold">{entry.salesName}</td>
                  <td className="py-1 text-right">{entry.orderCount}</td>
                  <td className="py-1 text-right">
                    {formatNumber(entry.quantity)}
                  </td>
                  <td className="py-1 text-right">
                    {formatRupiah(entry.nominal)}
                  </td>
                  <td className="py-1 text-right font-semibold">
                    {formatRupiah(entry.bonus)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-ink/30">
                <td className="py-1 font-bold" colSpan={4}>
                  Total bonus bulan ini
                </td>
                <td className="py-1 text-right font-bold">
                  {formatRupiah(month.totalBonus)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-5">
          <h2 className="m-0 mb-1.5 text-[12px] font-bold">
            Rincian Transaksi
          </h2>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-ink/30 text-left text-ink-muted">
                <th className="py-1 font-semibold">Dokumen</th>
                <th className="py-1 font-semibold">Tanggal</th>
                <th className="py-1 font-semibold">Sales</th>
                <th className="py-1 font-semibold">Pelanggan</th>
                <th className="py-1 text-right font-semibold">Pcs</th>
                <th className="py-1 text-right font-semibold">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {month.transactions.length === 0 ? (
                <tr>
                  <td className="py-1 text-ink-muted" colSpan={6}>
                    Tidak ada transaksi
                  </td>
                </tr>
              ) : null}
              {month.transactions.map((row) => (
                <tr key={`${row.source}-${row.id}`} className="border-t border-line">
                  <td className="py-1 font-semibold whitespace-nowrap">
                    {row.number}
                  </td>
                  <td className="py-1 whitespace-nowrap">
                    {formatDateTimeShort(row.at)}
                  </td>
                  <td className="py-1">{row.salesName}</td>
                  <td className="py-1">{row.customerName}</td>
                  <td className="py-1 text-right">
                    {formatNumber(row.quantity)}
                  </td>
                  <td className="py-1 text-right">
                    {formatRupiah(row.nominal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-5">
          <h2 className="m-0 mb-1.5 text-[12px] font-bold">
            Akumulasi Bonus {year.year}
          </h2>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-ink/30 text-left text-ink-muted">
                <th className="py-1 font-semibold">Sales</th>
                {year.monthLabels.map((label) => (
                  <th key={label} className="py-1 text-right font-semibold">
                    {label.slice(0, 3)}
                  </th>
                ))}
                <th className="py-1 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {year.perSales.length === 0 ? (
                <tr>
                  <td className="py-1 text-ink-muted" colSpan={14}>
                    Belum ada bonus pada tahun ini
                  </td>
                </tr>
              ) : null}
              {year.perSales.map((row) => (
                <tr key={row.salesEmployeeId} className="border-t border-line">
                  <td className="py-1 font-semibold">{row.salesName}</td>
                  {row.months.map((amount, index) => (
                    <td key={index} className="py-1 text-right">
                      {amount > 0 ? formatNumber(amount) : "-"}
                    </td>
                  ))}
                  <td className="py-1 text-right font-bold">
                    {formatRupiah(row.totalBonus)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-ink/30">
                <td className="py-1 font-bold" colSpan={13}>
                  Total bonus {year.year}
                </td>
                <td className="py-1 text-right font-bold">
                  {formatRupiah(year.totalBonus)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <div className="mt-6 border-t border-ink/30 pt-2 text-[10px] text-ink-muted">
          Dicetak dari {business.name} · bonus dihitung dari pesanan/transaksi
          yang sudah lunas.
        </div>
      </div>
    </div>,
    document.body,
  );
}
