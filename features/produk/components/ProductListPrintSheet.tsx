"use client";

import { createPortal } from "react-dom";
import { formatDateTimeLong } from "@/lib/format";
import type {
  ProductListSheetMeta,
  ProductRow,
} from "@/features/produk/types";

interface ProductListPrintSheetProps {
  rows: readonly ProductRow[];
  meta: ProductListSheetMeta;
  printedBy: string;
}

/** Lembar opname A4 portrait hitam putih; kolom fisik diisi tangan. */
export function ProductListPrintSheet({
  rows,
  meta,
  printedBy,
}: ProductListPrintSheetProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div id="product-list-print-root" className="hidden" aria-hidden="true">
      <div className="report-paper bg-white px-6 py-6 text-black">
        <div className="flex items-start justify-between gap-4 border-b border-black pb-2">
          <div>
            <div className="text-[16px] font-bold">
              Daftar Produk · Opname Gudang
            </div>
            <div className="mt-1 text-[11px]">
              Cabang: <span className="font-semibold">{meta.branchLabel}</span>
            </div>
            <div className="text-[11px]">Filter: {meta.filterLabel}</div>
          </div>
          <div className="text-right text-[11px]">
            <div>Tanggal: {meta.dateLabel}</div>
            <div>{rows.length} produk</div>
          </div>
        </div>

        <table className="mt-3 w-full border-collapse text-[11px]">
          <thead>
            <tr className="text-left">
              <th className="w-8 border border-black px-1.5 py-1 text-center font-bold">
                No
              </th>
              <th className="w-28 border border-black px-1.5 py-1 font-bold">
                Kode/SKU
              </th>
              <th className="border border-black px-1.5 py-1 font-bold">
                Nama Produk
              </th>
              <th className="w-36 border border-black px-1.5 py-1 font-bold">
                Kategori
              </th>
              <th className="w-20 border border-black px-1.5 py-1 text-right font-bold">
                Stok Sistem
              </th>
              <th className="w-24 border border-black px-1.5 py-1 text-center font-bold">
                Stok Fisik
              </th>
              <th className="w-24 border border-black px-1.5 py-1 text-center font-bold">
                Selisih
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  className="border border-black px-1.5 py-2 text-center"
                  colSpan={7}
                >
                  Tidak ada produk pada filter ini.
                </td>
              </tr>
            ) : null}
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td className="border border-black px-1.5 py-[6px] text-center">
                  {index + 1}
                </td>
                <td className="border border-black px-1.5 py-[6px] whitespace-nowrap">
                  {row.sku}
                </td>
                <td className="border border-black px-1.5 py-[6px]">
                  {row.name}
                </td>
                <td className="border border-black px-1.5 py-[6px]">
                  {row.categoryName}
                </td>
                <td className="border border-black px-1.5 py-[6px] text-right">
                  {row.stock}
                </td>
                <td className="border border-black px-1.5 py-[18px]" />
                <td className="border border-black px-1.5 py-[18px]" />
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-between text-[10px] text-black">
          <span>
            Dicetak {formatDateTimeLong(new Date())} oleh {printedBy}
          </span>
          <span>
            {meta.branchLabel} · {meta.dateLabel}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
