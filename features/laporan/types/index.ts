import type { Role } from "@/constants/roles";
import type { PaymentMethod, SessionUser } from "@/types";

export interface ReportStats {
  revenue: number;
  grossProfit: number;
  marginPercent: number;
  transactionCount: number;
  averageTransaction: number;
  totalSalesBonus: number;
  activeSalespeople: number;
}

export interface PaymentBreakdown {
  method: PaymentMethod;
  amount: number;
  percent: number;
}

export interface CashierReport {
  name: string;
  transactionCount: number;
  revenue: number;
}

export interface BestSeller {
  rank: number;
  name: string;
  soldCount: number;
}

export type ActivityAction =
  | "Membuat"
  | "Mengubah"
  | "Membatalkan"
  | "Membuka";

export interface ActivityLog {
  id: string;
  loggedAt: string;
  userName: string;
  role: Role;
  action: ActivityAction;
  detail: string;
}

export interface ReportsData {
  header: {
    title: string;
    subtitle: string;
  };
  user: SessionUser;
  stats: ReportStats;
  paymentBreakdown: readonly PaymentBreakdown[];
  cashiers: readonly CashierReport[];
  cashDifference: number;
  bestSellers: readonly BestSeller[];
  activityLog: readonly ActivityLog[];
  roles: readonly Role[];
}
