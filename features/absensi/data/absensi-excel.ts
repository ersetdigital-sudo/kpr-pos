"use client";

import { formatMonthValue } from "@/features/absensi/data/absensi-calculations";
import type { MonthlyRecapRow } from "@/features/absensi/types";

export async function exportMonthlyRecapExcel(
  rows: readonly MonthlyRecapRow[],
  monthLabel: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const sheet = XLSX.utils.aoa_to_sheet([
    ["Rekap Absensi Bulanan", monthLabel],
    [],
    ["Karyawan", "Role", "Cabang", "Hadir", "Telat", "Izin", "Sakit", "Alpa", "Hari Tercatat"],
    ...rows.map((row) => [
      row.employeeName,
      row.role,
      row.branchName,
      row.present,
      row.late,
      row.leave,
      row.sick,
      row.absent,
      row.totalDays,
    ]),
  ]);

  sheet["!cols"] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 20 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, "Rekap Absensi");
  XLSX.writeFile(workbook, `rekap-absensi-${formatMonthValue(new Date())}.xlsx`);
}
