import type { Customer, SalesOrderStatus } from "@/lib/store/types";

export interface CustomerInput {
  id?: string;
  name: string;
  phone: string;
  /** Alamat untuk kop dokumen cetak. */
  address?: string;
  /** NPWP untuk kop dokumen cetak. */
  npwp?: string;
  /** Penanda boleh tempo; hanya role berwenang yang bisa mengubah. */
  allowTempo: boolean;
  branchId?: string;
}

export interface CustomerRow extends Customer {
  /** Jumlah pesanan COD/Tempo yang belum lunas milik pelanggan ini. */
  activeCreditCount: number;
  activeTempo: boolean;
}

/** Baris rekap belanja per pelanggan pada periode aktif. */
export interface CustomerRecapRow extends CustomerRow {
  transactionCount: number;
  totalSpending: number;
  lastPurchaseAt: string | null;
  /** Semua pesanan (termasuk batal) untuk penjaga hapus. */
  historyCount: number;
}

export interface CustomerHistoryRow {
  id: string;
  orderNumber: string;
  at: string;
  method: "Tunai" | "COD" | "Tempo";
  total: number;
  status: SalesOrderStatus;
  paymentScheme: "cash" | "cod" | "tempo";
}

export interface CustomerSpendingSummary {
  transactionCount: number;
  totalSpending: number;
  lastPurchaseAt: string | null;
}

export interface CustomerSpendingData {
  summary: CustomerSpendingSummary;
  history: CustomerHistoryRow[];
}

export type CustomerActionResult =
  | { ok: true; data: Customer }
  | { ok: false; error: string };

export interface CustomerDeleteResult {
  id: string;
  name: string;
  historyCount: number;
  alreadyDeleted: boolean;
}

export interface CustomerMergeResult {
  sourceName: string;
  targetName: string;
  movedOrders: number;
  movedActiveTempo: number;
  alreadyMerged: boolean;
}

export interface CustomerActiveResult {
  id: string;
  name: string;
  isActive: boolean;
  alreadyApplied: boolean;
}

export type CustomerManagementResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
