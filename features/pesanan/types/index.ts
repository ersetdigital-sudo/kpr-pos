export type SalesOrderStatus = "Belum sinkron" | "Menunggu bayar" | "Lunas";

export interface SalesOrder {
  id: string;
  customer: string;
  quantity: number;
  total: number;
  status: SalesOrderStatus;
}

export interface SalesStats {
  soldThisMonth: number;
  rank: number;
  totalSalespeople: number;
  runningBonus: number;
  bonusPerPiece: number;
  awaitingPaymentCount: number;
}

export interface LeaderboardEntry {
  rank: number;
  salesName: string;
  orderCount: number;
  soldCount: number;
  bonus: number;
  isCurrentUser: boolean;
}

export interface OrderProductOption {
  id: string;
  name: string;
  price: number;
}

export interface OrderDraftItem {
  productId: string;
  quantity: number;
}

export interface OrderDraft {
  items: readonly OrderDraftItem[];
  totalQuantity: number;
  totalAmount: number;
}

export interface SalesOrdersData {
  header: {
    title: string;
    subtitle: string;
  };
  stats: SalesStats;
  orders: readonly SalesOrder[];
  leaderboard: readonly LeaderboardEntry[];
  productOptions: readonly OrderProductOption[];
  draft: OrderDraft;
}
