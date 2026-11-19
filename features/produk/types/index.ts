import type {
  Branch,
  Category,
  Product,
  ProductUnit,
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
  wholesalePrice: number;
  baseUnit: string;
  lengthM?: number;
  weightKg?: number;
  units: ProductUnit[];
  unitsLoaded?: boolean;
  /** URL siap pakai untuk ditampilkan. */
  imageUrl?: string;
  /** Nilai mentah image_url di database (key R2 atau URL lama). */
  imageKey?: string;
  stock: number;
  minStock: number;
  status: StockStatus;
  isActive: boolean;
  /** Tampil di cabang yang sedang dipilih; false berarti disembunyikan. */
  isVisible: boolean;
}

export interface ProductFilters {
  search: string;
  categoryId: string | "all";
  branchId: StockScope;
  status: "all" | Exclude<StockStatus, "Nonaktif"> | "Nonaktif";
  /** Filter khusus untuk mengelola produk yang disembunyikan di cabang. */
  visibility: "visible" | "hidden";
  page: number;
  pageSize: number;
}

/** Label lembar opname: cabang, filter aktif, dan tanggal cetak. */
export interface ProductListSheetMeta {
  branchLabel: string;
  filterLabel: string;
  dateLabel: string;
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

export interface ProductUnitInput {
  name: string;
  content: number;
  price: number;
  wholesalePrice: number;
}

export interface ProductFormInput {
  name: string;
  sku: string;
  categoryId: string;
  costPrice: number;
  price: number;
  wholesalePrice: number;
  imageUrl?: string;
  minStock: number;
  baseUnit: string;
  lengthM: number | null;
  weightKg: number | null;
  /** Null berarti pertahankan satuan yang sudah ada (data gagal dimuat). */
  units: ProductUnitInput[] | null;
}

export interface CategoryUsage {
  category: Category;
  productCount: number;
}

export interface StockInFormItem {
  productId: string;
  /** Kosong berarti satuan dasar. */
  unitId?: string;
  quantity: number;
}

export interface StockRowInput {
  key: string;
  productId: string;
  unitId: string;
  quantity: number;
}

export interface StockProductOption {
  id: string;
  name: string;
  sku: string;
  stock: number;
  baseUnit: string;
  units: ProductUnit[];
}

export interface StockInInput {
  date: string;
  note: string;
  items: StockInFormItem[];
}

export interface OpnameInput {
  date: string;
  note: string;
  /** productId -> stok fisik dalam satuan yang dipilih. */
  physical: Record<string, { quantity: number; unitId: string }>;
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
  lengthM: number | null;
  weightKg: number | null;
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
  lengthM: number | null;
  weightKg: number | null;
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

