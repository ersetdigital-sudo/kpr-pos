import type {
  Branch,
  Category,
  Product,
  StockInRecord,
  StockLevel,
  StockOpnameRecord,
  StockTransferRecord,
} from "@/lib/store/types";

export type StockStatus = "Aman" | "Menipis" | "Habis" | "Nonaktif";

/** "all" hanya untuk role yang boleh melihat semua cabang. */
export type StockScope = string | "all";

export interface ProductRow {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  costPrice: number;
  price: number;
  /** URL siap pakai untuk ditampilkan. */
  imageUrl?: string;
  /** Nilai mentah image_url di database (key R2 atau URL lama). */
  imageKey?: string;
  stock: number;
  minStock: number;
  status: StockStatus;
  isActive: boolean;
}

export interface ProductFilters {
  search: string;
  categoryId: string | "all";
  branchId: StockScope;
  status: "all" | Exclude<StockStatus, "Nonaktif"> | "Nonaktif";
  page: number;
  pageSize: number;
}

export interface ProductStats {
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  incomingThisWeek: number;
  totalProducts: number;
}

export interface ProductPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProdukData {
  branches: Branch[];
  categories: Category[];
  stockIns: StockInRecord[];
  stockOpnames: StockOpnameRecord[];
  stockTransfers: StockTransferRecord[];
}

export interface ProductFormInput {
  name: string;
  sku: string;
  categoryId: string;
  costPrice: number;
  price: number;
  imageUrl?: string;
  minStock: number;
}

export interface CategoryUsage {
  category: Category;
  productCount: number;
}

export interface StockInFormItem {
  productId: string;
  quantity: number;
}

export interface StockRowInput {
  key: string;
  productId: string;
  quantity: number;
}

export interface StockProductOption {
  id: string;
  name: string;
  sku: string;
  stock: number;
}

export interface StockInInput {
  date: string;
  note: string;
  items: StockInFormItem[];
}

export interface OpnameInput {
  date: string;
  note: string;
  /** productId -> stok fisik hasil hitung. */
  physical: Record<string, number>;
}

export interface TransferInput {
  toBranchId: string;
  date: string;
  note: string;
  items: StockInFormItem[];
}

export interface ImportProductRow {
  rowNumber: number;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  costPrice: number;
  price: number;
  stock: number;
  minStock: number;
  errors: string[];
}

export interface ImportProductPayload {
  name: string;
  sku: string;
  categoryId: string;
  costPrice: number;
  price: number;
  stock: number;
  minStock: number;
}

export interface DeleteProductResult {
  mode: "deleted" | "deactivated";
  name: string;
}

export interface ProductStockSnapshot {
  categories: Category[];
  products: Product[];
  stocks: StockLevel[];
  stockIns: StockInRecord[];
  stockOpnames: StockOpnameRecord[];
  stockTransfers: StockTransferRecord[];
  isEmpty: boolean;
}

export type CloudActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type ProductPhotoUploadResult =
  | { ok: true; key: string }
  | { ok: false; error: string };

