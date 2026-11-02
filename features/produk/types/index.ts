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
  imageUrl?: string;
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

interface BootstrapBranch {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
}

interface BootstrapEmployee {
  id: string;
  name: string;
  phone: string;
  initials: string;
  role: string;
  branch_id: string;
  is_active: boolean;
}

interface BootstrapCategory {
  id: string;
  name: string;
  is_active: boolean;
}

interface BootstrapProduct {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  cost_price: number;
  price: number;
  image_url: string | null;
  is_active: boolean;
}

interface BootstrapStockLevel {
  branch_id: string;
  product_id: string;
  quantity: number;
  min_stock: number;
}

interface BootstrapStockIn {
  id: string;
  branch_id: string;
  date: string;
  note: string;
  user_id: string;
  created_at: string;
}

interface BootstrapStockInItem {
  stock_in_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
}

interface BootstrapStockOpname {
  id: string;
  branch_id: string;
  date: string;
  note: string;
  user_id: string;
  created_at: string;
}

interface BootstrapStockOpnameItem {
  opname_id: string;
  product_id: string;
  product_name: string;
  system_quantity: number;
  physical_quantity: number;
  difference: number;
}

interface BootstrapStockTransfer {
  id: string;
  from_branch_id: string;
  to_branch_id: string;
  date: string;
  note: string;
  user_id: string;
  created_at: string;
}

interface BootstrapStockTransferItem {
  transfer_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
}

export interface ProductStockBootstrapPayload {
  branches: BootstrapBranch[];
  employees: BootstrapEmployee[];
  categories: BootstrapCategory[];
  products: BootstrapProduct[];
  stock_levels: BootstrapStockLevel[];
  stock_ins: BootstrapStockIn[];
  stock_in_items: BootstrapStockInItem[];
  stock_opnames: BootstrapStockOpname[];
  stock_opname_items: BootstrapStockOpnameItem[];
  stock_transfers: BootstrapStockTransfer[];
  stock_transfer_items: BootstrapStockTransferItem[];
}

export type CloudActionResult =
  | { ok: true }
  | { ok: false; error: string };

export interface StockAdjustItem {
  productId: string;
  quantity: number;
}
