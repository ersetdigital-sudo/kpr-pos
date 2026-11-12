"use client";

import { formatDateShort, formatDateTimeShort } from "@/lib/format";
import type { KasbonRecapData } from "@/features/kasbon/types";

function dueDateLabel(dueDate: string | null, method: string): string {
  if (dueDate) return formatDateShort(dueDate);

  return method === "tempo" ? "Dihitung saat Owner menyetujui" : "-";
}

/** Ekspor rekap sesuai filter aktif: ringkasan, per karyawan, dan rincian. */
export async function exportKasbonRecapExcel(
  data: KasbonRecapData,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ["Rekap Kasbon"],
    ["Periode", data.labels.period],
    ["Cabang", data.labels.branch],
    ["Status", data.labels.status],
    ["Karyawan", data.labels.employee],
    ["Diekspor", formatDateTimeShort(new Date())],
    [],
    ["Metrik", "Jumlah Kasbon", "Nominal"],
    ["Diajukan", data.stats.requested.count, data.stats.requested.amount],
    ["Disetujui", data.stats.approved.count, data.stats.approved.amount],
    ["Lunas", data.stats.settled.count, data.stats.settled.amount],
    ["Belum lunas", data.stats.outstanding.count, data.stats.outstanding.amount],
    ["Ditolak", data.stats.rejected.count, data.stats.rejected.amount],
  ]);
  summary["!cols"] = [{ wch: 26 }, { wch: 20 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(workbook, summary, "Ringkasan");

  const employees = XLSX.utils.aoa_to_sheet([
    ["Karyawan", "Cabang", "Jumlah Kasbon", "Total Nominal"],
    ...data.employees.map((group) => [
      group.employeeName,
      group.branchName,
      group.count,
      group.totalAmount,
    ]),
  ]);
  employees["!cols"] = [{ wch: 26 }, { wch: 20 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, employees, "Rekap Karyawan");

  const details = XLSX.utils.aoa_to_sheet([
    [
      "Karyawan",
      "Cabang",
      "Nominal",
      "Alasan",
      "Metode Pelunasan",
      "Tanggal Pengajuan",
      "Status",
      "Disetujui Owner",
      "Jatuh Tempo",
      "Tanggal Lunas",
      "Petugas Pelunasan",
      "Alasan Penolakan",
    ],
    ...data.rows.map((row) => [
      row.employeeName,
      row.branchName,
      row.amount,
      row.reason,
      row.repaymentMethod === "tempo"
        ? `Tempo ${row.tempoValue ?? 0} ${row.tempoUnit ?? "hari"}`
        : "Potong gaji",
      formatDateTimeShort(row.createdAt),
      row.status,
      row.approvedAt ? formatDateTimeShort(row.approvedAt) : "-",
      dueDateLabel(row.dueDate, row.repaymentMethod),
      row.settledAt ? formatDateTimeShort(row.settledAt) : "-",
      row.settledAt ? row.settledByName || "-" : "-",
      row.status === "Ditolak" ? row.rejectionReason || "-" : "-",
    ]),
  ]);
  details["!cols"] = [
    { wch: 24 },
    { wch: 18 },
    { wch: 14 },
    { wch: 36 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 24 },
    { wch: 20 },
    { wch: 22 },
    { wch: 36 },
  ];
  XLSX.utils.book_append_sheet(workbook, details, "Rincian Kasbon");

  const approvals = XLSX.utils.aoa_to_sheet([
    ["Karyawan", "Nominal", "Tahap", "Keputusan", "Oleh", "Waktu", "Catatan"],
    ...data.rows.flatMap((row) =>
      row.approvals.map((approval) => [
        row.employeeName,
        row.amount,
        approval.stage,
        approval.decision,
        approval.decidedByName || "-",
        formatDateTimeShort(approval.decidedAt),
        approval.note || "-",
      ]),
    ),
  ]);
  approvals["!cols"] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 20 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(workbook, approvals, "Jejak Persetujuan");

  XLSX.writeFile(workbook, `rekap-kasbon-${data.filePeriod}.xlsx`);
}
