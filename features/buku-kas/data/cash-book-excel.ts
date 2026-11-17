"use client";

import { formatDateShort, formatDateTimeShort } from "@/lib/format";
import { buildCashBookLedger } from "@/features/buku-kas/data/calculations";
import type { CashBookView } from "@/features/buku-kas/types";

export interface CashBookSheetMeta {
  branchLabel: string;
  periodLabel: string;
  fileLabel: string;
}

/** Ringkasan + detail dengan saldo berjalan dari view Buku Kas yang sama. */
export async function exportCashBookExcel(
  view: CashBookView,
  meta: CashBookSheetMeta,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const ledger = buildCashBookLedger(view);

  const summary = XLSX.utils.aoa_to_sheet([
    ["Rekap Buku Kas"],
    ["Periode", meta.periodLabel],
    ["Cabang", meta.branchLabel],
    ["Diekspor", formatDateTimeShort(new Date())],
    [],
    ["Ringkasan", "Nominal"],
    ["Saldo awal", view.summary.saldoAwal],
    ["Total pemasukan", view.summary.totalMasuk],
    ["Total pengeluaran", view.summary.totalKeluar],
    ["Saldo akhir", view.summary.saldoAkhir],
    ["Jumlah baris", view.rows.length],
    ["Entri manual", view.summary.entryCount],
  ]);
  summary["!cols"] = [{ wch: 24 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summary, "Ringkasan");

  const details = XLSX.utils.aoa_to_sheet([
    [
      "Tanggal",
      "Kategori",
      "Keterangan",
      "Pemasukan",
      "Pengeluaran",
      "Saldo Berjalan",
    ],
    ...ledger.map(({ row, saldo }) => [
      formatDateShort(row.date),
      row.categoryName,
      row.description,
      row.type === "masuk" ? row.amount : 0,
      row.type === "keluar" ? row.amount : 0,
      saldo,
    ]),
  ]);
  details["!cols"] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 48 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, details, "Detail Buku Kas");

  if (view.monthlyRecap.length > 0) {
    const monthly = XLSX.utils.aoa_to_sheet([
      ["Bulan", "Pemasukan", "Pengeluaran", "Saldo"],
      ...view.monthlyRecap.map((month) => [
        month.label,
        month.masuk,
        month.keluar,
        month.saldo,
      ]),
    ]);
    monthly["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, monthly, "Rekap Bulanan");
  }

  XLSX.writeFile(workbook, `rekap-buku-kas-${meta.fileLabel}.xlsx`);
}
