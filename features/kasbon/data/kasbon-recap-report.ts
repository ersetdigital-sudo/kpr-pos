"use client";

import { formatRupiah } from "@/lib/format";
import { recordActivity } from "@/lib/store/activity";
import { exportKasbonRecapExcel } from "@/features/kasbon/data/kasbon-recap-excel";
import type { KasbonRecapData, KasbonRow } from "@/features/kasbon/types";

/** Ekspor Excel rekap memakai filter aktif dan mencatat aksinya ke log. */
export async function exportKasbonRecap(
  data: KasbonRecapData,
): Promise<void> {
  await exportKasbonRecapExcel(data);

  recordActivity({
    action: "Membuka",
    detail: `Export Excel rekap kasbon ${data.labels.period} · ${data.rows.length} kasbon`,
  });
}

/** Cetak/PDF rekap; isi cetakan hanya data yang lolos izin pengguna. */
export function logKasbonRecapPrint(
  data: KasbonRecapData,
  format: "PDF" | "Cetak",
): void {
  recordActivity({
    action: "Membuka",
    detail: `${format} rekap kasbon ${data.labels.period} · ${data.rows.length} kasbon`,
  });
}

export function logKasbonDetailPrint(row: KasbonRow): void {
  recordActivity({
    action: "Membuka",
    detail: `Cetak detail kasbon ${formatRupiah(row.amount)} · ${row.employeeName}`,
  });
}
