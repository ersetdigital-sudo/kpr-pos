"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { formatDateRange } from "@/lib/date-range";
import {
  formatDateTimeShort,
  formatNumber,
  formatPercent,
  formatRupiah,
} from "@/lib/format";
import type { BusinessProfile } from "@/lib/store/types";
import type { ReportData } from "@/features/laporan/types";

interface ReportPrintSheetProps {
  data: ReportData;
  business: BusinessProfile;
}

/** Versi siap cetak laporan; dipakai tombol Export PDF lewat window.print. */
export function ReportPrintSheet({ data, business }: ReportPrintSheetProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div id="report-print-root" className="hidden" aria-hidden="true">
      <div className="report-paper bg-white px-6 py-6 text-ink">
        <div className="flex items-start justify-between gap-4 border-b border-ink/30 pb-3">
          <div className="flex items-start gap-3">
            <Image
              src={business.logoUrl || "/logo-kpr.png"}
              alt="Logo usaha"
              width={56}
              height={58}
              className="object-contain"
            />
            <div>
              <div className="text-[15px] font-bold">{business.name}</div>
              <div className="text-[11px]">{business.address}</div>
              <div className="text-[11px]">{business.phone}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[18px] font-extrabold">Laporan Penjualan</div>
            <div className="text-[11px]">{formatDateRange(data.range)}</div>
          </div>
        </div>

        <table className="mt-4 w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className="py-1 pr-4 text-ink-muted">Omzet (tanpa PPN)</td>
              <td className="py-1 text-right font-semibold">
                {formatRupiah(data.stats.revenue)}
              </td>
              <td className="py-1 pl-8 pr-4 text-ink-muted">Laba Kotor</td>
              <td className="py-1 text-right font-semibold">
                {formatRupiah(data.stats.grossProfit)}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-ink-muted">Transaksi</td>
              <td className="py-1 text-right font-semibold">
                {formatNumber(data.stats.transactionCount)}
              </td>
              <td className="py-1 pl-8 pr-4 text-ink-muted">
                Rata-rata / transaksi
              </td>
              <td className="py-1 text-right font-semibold">
                {formatRupiah(data.stats.averageTransaction)}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-ink-muted">PPN terkumpul</td>
              <td className="py-1 text-right font-semibold">
                {formatRupiah(data.stats.taxCollected)}
              </td>
              <td className="py-1 pl-8 pr-4 text-ink-muted">
                Transaksi ber-PPN
              </td>
              <td className="py-1 text-right font-semibold">
                {formatNumber(data.stats.taxTransactionCount)}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-ink-muted">Margin</td>
              <td className="py-1 text-right font-semibold">
                {formatPercent(data.stats.marginPercent)}
              </td>
              <td className="py-1 pl-8 pr-4 text-ink-muted">
                Total bonus sales
              </td>
              <td className="py-1 text-right font-semibold">
                {formatRupiah(data.stats.totalSalesBonus)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-5 grid grid-cols-2 gap-5">
          <section>
            <h2 className="m-0 mb-1.5 text-[12px] font-bold">
              Per Metode Pembayaran
            </h2>
            <table className="w-full border-collapse text-[11px]">
              <tbody>
                {data.paymentBreakdown.map((item) => (
                  <tr key={item.method} className="border-t border-line">
                    <td className="py-1 font-semibold">{item.method}</td>
                    <td className="py-1 text-right">
                      {formatRupiah(item.amount)}
                    </td>
                    <td className="w-12 py-1 text-right text-ink-muted">
                      {formatPercent(item.percent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="m-0 mb-1.5 text-[12px] font-bold">Per Kasir</h2>
            <table className="w-full border-collapse text-[11px]">
              <tbody>
                {data.cashiers.length === 0 ? (
                  <tr>
                    <td className="py-1 text-ink-muted">Belum ada transaksi</td>
                  </tr>
                ) : null}
                {data.cashiers.map((cashier) => (
                  <tr key={cashier.cashierId} className="border-t border-line">
                    <td className="py-1 font-semibold">{cashier.name}</td>
                    <td className="py-1 text-right">
                      {formatNumber(cashier.transactionCount)} trx
                    </td>
                    <td className="w-28 py-1 text-right">
                      {formatRupiah(cashier.revenue)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line">
                  <td className="py-1 text-ink-muted" colSpan={2}>
                    Selisih kas
                  </td>
                  <td className="w-28 py-1 text-right font-semibold">
                    {formatRupiah(data.cashDifference)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <section className="mt-5">
          <h2 className="m-0 mb-1.5 text-[12px] font-bold">
            Produk Terlaris
          </h2>
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              {data.bestSellers.length === 0 ? (
                <tr>
                  <td className="py-1 text-ink-muted">
                    Belum ada produk terjual
                  </td>
                </tr>
              ) : null}
              {data.bestSellers.map((product) => (
                <tr key={product.rank} className="border-t border-line">
                  <td className="w-6 py-1 text-ink-muted">{product.rank}</td>
                  <td className="py-1 font-semibold">{product.name}</td>
                  <td className="w-20 py-1 text-right">
                    {formatNumber(product.soldCount)} pcs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-5">
          <h2 className="m-0 mb-1.5 text-[12px] font-bold">Rekap PPN</h2>
          <p className="m-0 mb-1 text-[10px] text-ink-muted">
            Omzet pada laporan ini tidak termasuk PPN. Ongkir tidak dikenai
            PPN.
          </p>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-ink/30 text-left text-ink-muted">
                <th className="py-1 font-semibold">Dokumen</th>
                <th className="py-1 font-semibold">Tanggal</th>
                <th className="py-1 font-semibold">Pelanggan / Kasir</th>
                <th className="py-1 text-right font-semibold">Dasar PPN</th>
                <th className="py-1 text-right font-semibold">Tarif</th>
                <th className="py-1 text-right font-semibold">PPN</th>
              </tr>
            </thead>
            <tbody>
              {data.taxRecap.length === 0 ? (
                <tr>
                  <td className="py-1 text-ink-muted" colSpan={6}>
                    Belum ada transaksi ber-PPN pada filter ini
                  </td>
                </tr>
              ) : null}
              {data.taxRecap.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-1 font-semibold whitespace-nowrap">
                    {row.number}
                  </td>
                  <td className="py-1 whitespace-nowrap">
                    {formatDateTimeShort(row.at)}
                  </td>
                  <td className="py-1">
                    {row.customerName || row.cashierName || "-"}
                  </td>
                  <td className="py-1 text-right">
                    {formatRupiah(row.taxBase)}
                  </td>
                  <td className="py-1 text-right">
                    {formatPercent(row.taxRate)}
                  </td>
                  <td className="py-1 text-right font-semibold">
                    {formatRupiah(row.taxAmount)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-ink/30">
                <td className="py-1 font-bold" colSpan={5}>
                  Total PPN terkumpul
                </td>
                <td className="py-1 text-right font-bold">
                  {formatRupiah(data.stats.taxCollected)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-5">
          <h2 className="m-0 mb-1.5 text-[12px] font-bold">Log Aktivitas</h2>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-ink/30 text-left text-ink-muted">
                <th className="py-1 font-semibold">Waktu</th>
                <th className="py-1 font-semibold">Pengguna</th>
                <th className="py-1 font-semibold">Role</th>
                <th className="py-1 font-semibold">Aksi</th>
                <th className="py-1 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {data.activityLog.length === 0 ? (
                <tr>
                  <td className="py-1 text-ink-muted" colSpan={5}>
                    Belum ada aktivitas pada filter ini
                  </td>
                </tr>
              ) : null}
              {data.activityLog.map((log) => (
                <tr key={log.id} className="border-t border-line">
                  <td className="py-1 whitespace-nowrap">
                    {formatDateTimeShort(log.at)}
                  </td>
                  <td className="py-1 font-semibold">{log.userName}</td>
                  <td className="py-1">{log.role}</td>
                  <td className="py-1">{log.action}</td>
                  <td className="py-1">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="mt-6 border-t border-ink/30 pt-2 text-[10px] text-ink-muted">
          Dicetak dari {business.name} ·{" "}
          {data.header.subtitle}
        </div>
      </div>
    </div>,
    document.body,
  );
}
