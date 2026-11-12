import type { SalesOrder, Transaction } from "@/lib/store/types";

export type CashBookType = "masuk" | "keluar";

/** Periode tampilan Buku Kas. */
export type CashBookPeriod = "harian" | "bulanan" | "tahunan";

/** "all" hanya untuk Owner; role lain selalu cabangnya sendiri. */
export type CashBookScope = string | "all";

export interface CashBookCategory {
  id: string;
  type: CashBookType;
  name: string;
  isActive: boolean;
}

export interface CashBookEntry {
  id: string;
  branchId: string;
  type: CashBookType;
  categoryId: string;
  amount: number;
  description: string;
  /** Tanggal entri (YYYY-MM-DD). */
  entryDate: string;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashBookBranch {
  id: string;
  name: string;
}

/** Parameter baca: periode terpilih + cakupan cabang. */
export interface CashBookQuery {
  period: CashBookPeriod;
  /** YYYY-MM-DD untuk periode harian. */
  date: string;
  /** YYYY-MM untuk periode bulanan. */
  month: string;
  /** YYYY untuk periode tahunan. */
  year: string;
  scope: CashBookScope;
}

/**
 * Data satu periode. Penjualan dikirim sebagai sumber mentah supaya aturan
 * rekapnya sama dengan Laporan (collectSalesFrom).
 */
export interface CashBookSource {
  openingBalance: number;
  categories: CashBookCategory[];
  entries: CashBookEntry[];
  branches: CashBookBranch[];
  transactions: Transaction[];
  salesOrders: SalesOrder[];
}

/** Satu baris tabel: entri manual atau rekap penjualan otomatis. */
export interface CashBookRow {
  id: string;
  /** Tanggal baris (YYYY-MM-DD); tampilan tahunan memakai awal bulan. */
  date: string;
  dateLabel: string;
  type: CashBookType;
  categoryName: string;
  description: string;
  amount: number;
  branchId: string;
  branchName: string;
  actorName: string;
  /** True untuk baris rekap penjualan yang tidak bisa diedit. */
  automatic: boolean;
  entryId?: string;
}

export interface CashBookMonthRecap {
  /** YYYY-MM */
  month: string;
  label: string;
  masuk: number;
  keluar: number;
  saldo: number;
}

export interface CashBookSummary {
  totalMasuk: number;
  totalKeluar: number;
  saldoAwal: number;
  saldoAkhir: number;
  entryCount: number;
}

export interface CashBookView {
  periodLabel: string;
  rows: CashBookRow[];
  summary: CashBookSummary;
  monthlyRecap: CashBookMonthRecap[];
}

export interface CashBookEntryInput {
  id?: string;
  branchId: string;
  type: CashBookType;
  categoryId: string;
  amount: number;
  description: string;
  entryDate: string;
}

export interface CashBookCategoryInput {
  id?: string;
  type: CashBookType;
  name: string;
}

export type CashBookActionResult =
  | { ok: true }
  | { ok: false; error: string };
