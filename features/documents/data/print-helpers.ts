import { formatDateLong } from "@/lib/format";
import type {
  DeliveryNotePage,
  DeliveryNotePaper,
  DocumentLine,
} from "@/features/documents/types";

const PAPER_STORAGE_KEY = "kpr-pos:delivery-note-paper";

/** Jumlah baris aman per halaman; header, total, dan tanda tangan ikut dihitung. */
const ROWS_PER_PAGE: Record<DeliveryNotePaper, number> = {
  dot_matrix: 22,
  // A4 menyisakan ruang untuk nama barang yang membungkus dan kolom tanda tangan.
  a4: 14,
};

export function readDeliveryNotePaper(): DeliveryNotePaper {
  if (typeof window === "undefined") return "dot_matrix";

  try {
    const value = window.localStorage.getItem(PAPER_STORAGE_KEY);
    return value === "a4" ? "a4" : "dot_matrix";
  } catch {
    return "dot_matrix";
  }
}

export function saveDeliveryNotePaper(paper: DeliveryNotePaper): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PAPER_STORAGE_KEY, paper);
  } catch {
    // Pilihan kertas hanya preferensi; gagal menyimpan tidak menghalangi cetak.
  }
}

export function paginateDeliveryNote(
  items: readonly DocumentLine[],
  paper: DeliveryNotePaper,
): DeliveryNotePage[] {
  const perPage = ROWS_PER_PAGE[paper];
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));

  return Array.from({ length: totalPages }, (_, index) => {
    const start = index * perPage;
    const pageItems = items.slice(start, start + perPage);

    return {
      items: pageItems,
      pageNumber: index + 1,
      totalPages,
      isLast: index === totalPages - 1,
    };
  });
}

export function buildPageSizeCss(paper: DeliveryNotePaper): string {
  return `@page { size: ${paper === "a4" ? "A4" : "9.5in 11in"}; margin: 0; }`;
}

export function formatDocumentDate(value: string): string {
  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart)
    ? formatDateLong(datePart)
    : value;
}
