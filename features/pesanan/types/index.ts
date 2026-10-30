import type {
  SalesBonusSettings,
  SalesOrderStatus,
} from "@/lib/store/types";

export interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  branchId: string;
  branchName: string;
  salesEmployeeId: string;
  salesName: string;
  quantity: number;
  total: number;
  status: SalesOrderStatus;
  note: string;
  createdAt: string;
}

export interface SalesStats {
  soldThisMonth: number;
  rank: number;
  totalSalespeople: number;
  runningBonus: number;
  bonusRuleLabel: string;
  awaitingPaymentCount: number;
}

export interface LeaderboardEntry {
  rank: number;
  salesEmployeeId: string;
  salesName: string;
  orderCount: number;
  soldCount: number;
  bonus: number;
  isCurrentUser: boolean;
}

export interface OrderProductOption {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

export interface SalesEmployeeOption {
  id: string;
  name: string;
  branchId: string;
}

export interface NewOrderRow {
  key: string;
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  note: string;
  branchId: string;
  salesEmployeeId: string;
  items: { productId: string; quantity: number }[];
}

export interface BonusEntry {
  salesEmployeeId: string;
  salesName: string;
  orderCount: number;
  quantity: number;
  nominal: number;
  bonus: number;
}

export interface BonusBoard {
  entries: BonusEntry[];
  settings: SalesBonusSettings;
}
