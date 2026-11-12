"use client";

import { formatDateTimeShort } from "@/lib/format";
import type {
  BonusMonthReport,
  BonusYearReport,
} from "@/features/bonus/types";

/** Export rekap bonus bulanan + akumulasi tahunan (pola rekap kasbon). */
export async function exportBonusExcel(
  month: BonusMonthReport,
  year: BonusYearReport,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ["Rekap Bonus Sales"],
    ["Periode", month.monthLabel],
    ["Aturan bonus", month.ruleLabel],
    ["Diekspor", formatDateTimeShort(new Date())],
    [],
    ["Metrik", "Nilai"],
    ["Total pcs", month.totalQuantity],
    ["Total nominal", month.totalNominal],
    ["Total bonus", month.totalBonus],
    [`Akumulasi bonus ${year.year}`, year.totalBonus],
  ]);
  summary["!cols"] = [{ wch: 28 }, { wch: 34 }];
  XLSX.utils.book_append_sheet(workbook, summary, "Ringkasan");

  const perSales = XLSX.utils.aoa_to_sheet([
    ["Sales", "Jumlah Transaksi", "Pcs", "Nominal", "Bonus"],
    ...month.entries.map((entry) => [
      entry.salesName,
      entry.orderCount,
      entry.quantity,
      entry.nominal,
      entry.bonus,
    ]),
  ]);
  perSales["!cols"] = [
    { wch: 24 },
    { wch: 18 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, perSales, "Per Sales");

  const perTransaction = XLSX.utils.aoa_to_sheet([
    [
      "No. Dokumen",
      "Sumber",
      "Tanggal Lunas",
      "Sales",
      "Pelanggan",
      "Cabang",
      "Pcs",
      "Nominal",
    ],
    ...month.transactions.map((row) => [
      row.number,
      row.source,
      formatDateTimeShort(row.at),
      row.salesName,
      row.customerName,
      row.branchName,
      row.quantity,
      row.nominal,
    ]),
  ]);
  perTransaction["!cols"] = [
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 10 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, perTransaction, "Per Transaksi");

  const yearly = XLSX.utils.aoa_to_sheet([
    ["Akumulasi Bonus", String(year.year)],
    [],
    ["Sales", ...year.monthLabels, "Total pcs", "Total nominal", "Total bonus"],
    ...year.perSales.map((row) => [
      row.salesName,
      ...row.months,
      row.quantity,
      row.nominal,
      row.totalBonus,
    ]),
    [
      "Total",
      ...year.monthTotals,
      year.totalQuantity,
      year.totalNominal,
      year.totalBonus,
    ],
  ]);
  yearly["!cols"] = [
    { wch: 24 },
    ...year.monthLabels.map(() => ({ wch: 12 })),
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, yearly, `Akumulasi ${year.year}`);

  XLSX.writeFile(workbook, `rekap-bonus-${month.month}.xlsx`);
}
