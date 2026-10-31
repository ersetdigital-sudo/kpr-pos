"use client";

import { toDateInputValue } from "@/lib/date-range";
import { formatDateTimeShort } from "@/lib/format";
import type { ReportData } from "@/features/laporan/types";

export async function exportReportExcel(data: ReportData): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ["Laporan POS"],
    ["Periode", data.header.subtitle],
    [],
    ["Metrik", "Nilai"],
    ["Omzet", data.stats.revenue],
    ["Laba Kotor", data.stats.grossProfit],
    ["Margin (%)", Number(data.stats.marginPercent.toFixed(1))],
    ["Jumlah Transaksi", data.stats.transactionCount],
    ["Rata-rata Transaksi", data.stats.averageTransaction],
    ["Total Bonus Sales", data.stats.totalSalesBonus],
    ["Sales Aktif", data.stats.activeSalespeople],
    ["Selisih Kas", data.cashDifference],
  ]);
  summary["!cols"] = [{ wch: 26 }, { wch: 42 }];
  XLSX.utils.book_append_sheet(workbook, summary, "Ringkasan");

  const payments = XLSX.utils.aoa_to_sheet([
    ["Metode", "Nominal", "Persentase (%)"],
    ...data.paymentBreakdown.map((item) => [
      item.method,
      item.amount,
      item.percent,
    ]),
  ]);
  payments["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(workbook, payments, "Metode Pembayaran");

  const cashiers = XLSX.utils.aoa_to_sheet([
    ["Kasir", "Jumlah Transaksi", "Omzet"],
    ...data.cashiers.map((item) => [
      item.name,
      item.transactionCount,
      item.revenue,
    ]),
  ]);
  cashiers["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, cashiers, "Per Kasir");

  const bestSellers = XLSX.utils.aoa_to_sheet([
    ["#", "Produk", "Terjual (pcs)"],
    ...data.bestSellers.map((item) => [
      item.rank,
      item.name,
      item.soldCount,
    ]),
  ]);
  bestSellers["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(workbook, bestSellers, "Produk Terlaris");

  const transactions = XLSX.utils.aoa_to_sheet([
    [
      "Sumber",
      "No. Dokumen",
      "Tanggal",
      "Kasir",
      "Cabang",
      "Metode",
      "Subtotal",
      "Diskon",
      "Total",
      "Laba Kotor",
    ],
    ...data.transactions.map((item) => [
      item.source,
      item.invoiceNumber,
      formatDateTimeShort(item.createdAt),
      item.cashierName,
      item.branchName,
      item.method,
      item.subtotal,
      item.discount,
      item.total,
      item.profit,
    ]),
  ]);
  transactions["!cols"] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, transactions, "Transaksi");

  const logs = XLSX.utils.aoa_to_sheet([
    ["Waktu", "Pengguna", "Role", "Cabang", "Aksi", "Detail"],
    ...data.activityLog.map((log) => [
      formatDateTimeShort(log.at),
      log.userName,
      log.role,
      log.branchName,
      log.action,
      log.detail,
    ]),
  ]);
  logs["!cols"] = [
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 20 },
    { wch: 14 },
    { wch: 48 },
  ];
  XLSX.utils.book_append_sheet(workbook, logs, "Log Aktivitas");

  XLSX.writeFile(
    workbook,
    `laporan-${toDateInputValue(data.range.start)}-${toDateInputValue(data.range.end)}.xlsx`,
  );
}
