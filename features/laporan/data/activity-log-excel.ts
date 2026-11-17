"use client";

import { formatDateTimeLong, formatDateTimeShort } from "@/lib/format";
import type { ActivityLog } from "@/lib/store/types";

export interface ActivityLogSheetMeta {
  /** Contoh: "18 November 2026 · KPR.1". */
  periodLabel: string;
  /** Ringkasan filter role/user/aksi yang aktif. */
  filtersLabel: string;
  branchNameById: ReadonlyMap<string, string>;
}

export async function exportActivityLogExcel(
  rows: readonly ActivityLog[],
  meta: ActivityLogSheetMeta,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Log Aktivitas"],
    ["Periode", meta.periodLabel],
    ["Filter", meta.filtersLabel],
    ["Diekspor", formatDateTimeShort(new Date())],
    ["Jumlah log", rows.length],
    [],
    ["Waktu", "Pengguna", "Role", "Cabang", "Aksi", "Keterangan"],
    ...rows.map((log) => [
      formatDateTimeLong(log.at),
      log.userName,
      log.role,
      meta.branchNameById.get(log.branchId) ?? "-",
      log.action,
      log.detail,
    ]),
  ]);

  sheet["!cols"] = [
    { wch: 24 },
    { wch: 22 },
    { wch: 14 },
    { wch: 20 },
    { wch: 16 },
    { wch: 60 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, "Log Aktivitas");
  XLSX.writeFile(workbook, `log-aktivitas-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
