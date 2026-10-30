import type { SessionUser } from "@/types";

export type StockStatus = "Aman" | "Menipis" | "Habis";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  price: number;
  stock: number;
  status: StockStatus;
}

export interface ProductStats {
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  incomingThisWeek: number;
}

export interface ProductPagination {
  from: number;
  to: number;
  total: number;
}

export interface ProductsData {
  header: {
    title: string;
    subtitle: string;
  };
  user: SessionUser;
  stats: ProductStats;
  categories: readonly string[];
  products: readonly Product[];
  pagination: ProductPagination;
}
