"use client";

import { toDateInputValue } from "@/lib/date-range";
import type { ProductListSheetMeta, ProductRow } from "@/features/produk/types";

/** Daftar produk untuk opname: kolom stok fisik & selisih sengaja kosong. */
export async function exportProductListExcel(
  rows: readonly ProductRow[],
  meta: ProductListSheetMeta,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Daftar Produk · Opname Gudang"],
    ["Cabang", meta.branchLabel],
    ["Tanggal", meta.dateLabel],
    ["Filter", meta.filterLabel],
    [],
    [
      "No",
      "Kode/SKU",
      "Nama Produk",
      "Kategori",
      "Stok Sistem",
      "Stok Fisik",
      "Selisih",
    ],
    ...rows.map((row, index) => [
      index + 1,
      row.sku,
      row.name,
      row.categoryName,
      row.stock,
      "",
      "",
    ]),
  ]);

  sheet["!cols"] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 36 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, "Opname Gudang");
  XLSX.writeFile(
    workbook,
    `daftar-produk-opname-${toDateInputValue(new Date())}.xlsx`,
  );
}
