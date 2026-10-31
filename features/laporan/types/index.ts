import type { Role } from "@/constants/roles";
import type { ActivityAction } from "@/lib/store/types";
import type {
  SalesSource,
  SalesSourceSummary,
} from "@/lib/store/sales";
import type { PaymentMethod } from "@/types";
import type { DateRange } from "@/lib/date-range";
import type { DateRangeValue } from "@/components/ui/DateRangePicker";

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
  cashierId: string;
  name: string;
  transactionCount: number;
  revenue: number;
}

export interface BestSeller {
  rank: number;
  name: string;
  soldCount: number;
}

export interface ReportLogRow {
  id: string;
  at: string;
  userId: string;
  userName: string;
  role: Role;
  branchName: string;
  action: ActivityAction;
  detail: string;
}

export interface ReportLogUser {
  id: string;
  name: string;
  role: Role;
}

export interface ReportTransactionRow {
  invoiceNumber: string;
  source: SalesSource;
  createdAt: string;
  cashierName: string;
  branchName: string;
  method: PaymentMethod | "-";
  subtotal: number;
  discount: number;
  total: number;
  profit: number;
}

export interface ReportData {
  header: {
    title: string;
    subtitle: string;
  };
  range: DateRange;
  stats: ReportStats;
  sourceBreakdown: readonly SalesSourceSummary[];
  paymentBreakdown: readonly PaymentBreakdown[];
  cashiers: readonly CashierReport[];
  cashDifference: number;
  bestSellers: readonly BestSeller[];
  activityLog: readonly ReportLogRow[];
  logUsers: readonly ReportLogUser[];
  roles: readonly Role[];
  transactions: readonly ReportTransactionRow[];
}

export interface ReportFilterState {
  range: DateRangeValue;
  branchId: string | "all";
  role: Role | "all";
  userId: string | "all";
}
