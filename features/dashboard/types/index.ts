import type { PaymentMethod } from "@/types";

export interface DashboardPaymentCounts {
  cash: number;
  qris: number;
  transfer: number;
}

export interface DashboardStats {
  salesToday: number;
  /** PPN terkumpul hari ini; omzet di atas tidak termasuk PPN. */
  taxToday: number;
  taxTransactionCount: number;
  growthPercent: number;
  transactionCount: number;
  /** Pesanan sales Lunas hari ini; tidak punya metode pembayaran. */
  salesOrderCount: number;
  paymentCounts: DashboardPaymentCounts;
  lowStockCount: number;
  employeesPresent: number;
  employeesTotal: number;
  employeesOnLeave: number;
  attendanceDate: string | null;
}

export interface WeeklySale {
  key: string;
  day: string;
  total: number;
  barHeight: number;
  isCurrentDay: boolean;
}

export interface TopSalesEntry {
  rank: number;
  name: string;
  soldCount: number;
  bonus: number;
  progress: number;
}

export interface RecentTransaction {
  id: string;
  invoiceNumber: string;
  time: string;
  cashier: string;
  method: PaymentMethod;
  total: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  branch: string;
  remaining: number;
}

export interface DashboardData {
  header: {
    title: string;
    subtitle: string;
  };
  stats: DashboardStats;
  weeklySales: readonly WeeklySale[];
  topSales: readonly TopSalesEntry[];
  recentTransactions: readonly RecentTransaction[];
  lowStock: readonly LowStockProduct[];
}

export type DashboardScope = string | "all";
