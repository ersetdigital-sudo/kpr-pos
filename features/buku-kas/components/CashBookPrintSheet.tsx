"use client";

import { createPortal } from "react-dom";
import { formatDateShort, formatDateTimeLong, formatRupiah } from "@/lib/format";
import { buildCashBookLedger } from "@/features/buku-kas/data/calculations";
import type { BusinessProfile } from "@/lib/store/types";
import type { CashBookView } from "@/features/buku-kas/types";

interface CashBookPrintSheetProps {
  view: CashBookView;
  business: BusinessProfile;
  branchLabel: string;
  printedBy: string;
}

/** Rekap Buku Kas siap cetak; semua angka berasal dari view yang tampil. */
export function CashBookPrintSheet({
  view,
  business,
  branchLabel,
  printedBy,
}: CashBookPrintSheetProps) {
  if (typeof document === "undefined") return null;

  const ledger = buildCashBookLedger(view);

  return createPortal(
    <div id="cash-book-print-root" className="hidden" aria-hidden="true">
      <div className="report-paper bg-white px-6 py-6 text-ink">
        <div className="flex items-start justify-between gap-4 border-b border-ink/30 pb-2">
          <div>
            <div className="text-[15px] font-bold">{business.name}</div>
            <div className="text-[11px]">{business.address}</div>
            <div className="text-[11px]">{business.phone}</div>
          </div>
          <div className="text-right">
            <div className="text-[17px] font-bold">Rekap Buku Kas</div>
            <div className="text-[11px]">{view.periodLabel}</div>
            <div className="text-[11px]">{branchLabel}</div>
          </div>
        </div>

        <section className="mt-3">
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <tr className="border-t border-line">
                <td className="py-1 font-semibold">Saldo awal</td>
                <td className="py-1 text-right">
                  {formatRupiah(view.summary.saldoAwal)}
                </td>
                <td className="py-1 pl-8 font-semibold">Total pengeluaran</td>
                <td className="py-1 text-right">
                  {formatRupiah(view.summary.totalKeluar)}
                </td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-1 font-semibold">Total pemasukan</td>
                <td className="py-1 text-right">
                  {formatRupiah(view.summary.totalMasuk)}
                </td>
                <td className="py-1 pl-8 font-semibold">Saldo akhir</td>
                <td className="py-1 text-right font-bold">
                  {formatRupiah(view.summary.saldoAkhir)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-4">
          <h2 className="m-0 mb-1.5 text-[12px] font-bold">
            Detail Entri per Tanggal
          </h2>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-ink/30 text-left text-ink-muted">
                <th className="py-1 font-semibold">Tanggal</th>
                <th className="py-1 font-semibold">Kategori</th>
                <th className="py-1 font-semibold">Keterangan</th>
                <th className="py-1 text-right font-semibold">Pemasukan</th>
                <th className="py-1 text-right font-semibold">Pengeluaran</th>
                <th className="py-1 text-right font-semibold">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td className="py-1 text-ink-muted" colSpan={6}>
                    Belum ada mutasi kas pada periode ini.
                  </td>
                </tr>
              ) : null}
              {ledger.map(({ row, saldo }) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-1 whitespace-nowrap">
                    {formatDateShort(row.date)}
                  </td>
                  <td className="py-1">{row.categoryName}</td>
                  <td className="py-1">{row.description}</td>
                  <td className="py-1 text-right whitespace-nowrap">
                    {row.type === "masuk" ? formatRupiah(row.amount) : "—"}
                  </td>
                  <td className="py-1 text-right whitespace-nowrap">
                    {row.type === "keluar" ? formatRupiah(row.amount) : "—"}
                  </td>
                  <td className="py-1 text-right font-semibold whitespace-nowrap">
                    {formatRupiah(saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {view.monthlyRecap.length > 0 ? (
          <section className="mt-4">
            <h2 className="m-0 mb-1.5 text-[12px] font-bold">
              Rekap Bulanan
            </h2>
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-ink/30 text-left text-ink-muted">
                  <th className="py-1 font-semibold">Bulan</th>
                  <th className="py-1 text-right font-semibold">Pemasukan</th>
                  <th className="py-1 text-right font-semibold">Pengeluaran</th>
                  <th className="py-1 text-right font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {view.monthlyRecap.map((month) => (
                  <tr key={month.month} className="border-t border-line">
                    <td className="py-1 font-semibold">{month.label}</td>
                    <td className="py-1 text-right">
                      {formatRupiah(month.masuk)}
                    </td>
                    <td className="py-1 text-right">
                      {formatRupiah(month.keluar)}
                    </td>
                    <td className="py-1 text-right font-semibold">
                      {formatRupiah(month.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <div className="mt-5 border-t border-ink/30 pt-2 text-[10px] text-ink-muted">
          Dicetak {formatDateTimeLong(new Date())} oleh {printedBy} ·{" "}
          {business.name} · {view.periodLabel} · {branchLabel}
        </div>
      </div>
    </div>,
    document.body,
  );
}
