"use client";

import {
  formatDateTimeShort,
  formatNumber,
} from "@/lib/format";
import type { CustomerRecapRow } from "@/features/pelanggan/types";

export interface CustomerRecapSheetMeta {
  periodLabel: string;
}

export async function exportCustomerRecapExcel(
  rows: readonly CustomerRecapRow[],
  meta: CustomerRecapSheetMeta,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Rekap Belanja Pelanggan"],
    ["Periode", meta.periodLabel],
    ["Diekspor", formatDateTimeShort(new Date())],
    ["Jumlah pelanggan", formatNumber(rows.length)],
    [],
    [
      "Pelanggan",
      "No. HP",
      "Jumlah Transaksi",
      "Total Belanja",
      "Belanja Terakhir",
      "Tagihan Berjalan",
    ],
    ...rows.map((row) => [
      row.name,
      row.phone || "-",
      row.transactionCount,
      row.totalSpending,
      row.lastPurchaseAt
        ? formatDateTimeShort(row.lastPurchaseAt)
        : "-",
      row.activeCreditCount,
    ]),
  ]);

  sheet["!cols"] = [
    { wch: 30 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, "Rekap Pelanggan");
  XLSX.writeFile(
    workbook,
    `rekap-belanja-pelanggan-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
