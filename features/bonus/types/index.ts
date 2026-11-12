import type { BonusEntry } from "@/features/pesanan/types";

/** Satu transaksi/pesanan yang ikut dihitung sebagai dasar bonus. */
export interface BonusTransactionRow {
  id: string;
  number: string;
  source: "Kasir" | "Pesanan Sales";
  at: string;
  salesEmployeeId: string;
  salesName: string;
  customerName: string;
  branchName: string;
  quantity: number;
  nominal: number;
}

export interface BonusMonthReport {
  /** YYYY-MM */
  month: string;
  monthLabel: string;
  entries: BonusEntry[];
  transactions: BonusTransactionRow[];
  totalQuantity: number;
  totalNominal: number;
  totalBonus: number;
  ruleLabel: string;
}

export interface BonusYearSalesRow {
  salesEmployeeId: string;
  salesName: string;
  /** Bonus per bulan Jan–Des (index 0 = Januari). */
  months: number[];
  quantity: number;
  nominal: number;
  totalBonus: number;
}

export interface BonusYearReport {
  year: number;
  monthLabels: string[];
  monthTotals: number[];
  perSales: BonusYearSalesRow[];
  totalBonus: number;
  totalQuantity: number;
  totalNominal: number;
}
