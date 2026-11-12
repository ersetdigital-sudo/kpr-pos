import type {
  DiscountType,
  PriceType,
  SalesBonusSettings,
  SalesOrderStatus,
  ShippingMethod,
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
  /** Transaksi kasir yang membayar pesanan ini, jika ada. */
  transactionId: string | null;
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
  wholesalePrice: number;
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
  priceType: PriceType;
  discountType: DiscountType;
  discountValue: number;
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  note: string;
  branchId: string;
  salesEmployeeId: string;
  items: {
    productId: string;
    quantity: number;
    priceType: PriceType;
    discountType: DiscountType;
    discountValue: number;
  }[];
  taxEnabled: boolean;
  taxRate: number;
  shippingMethod: ShippingMethod;
  shippingCost: number;
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
