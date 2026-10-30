import type { Role } from "@/constants/roles";
import type { PaymentMethod } from "@/types";

export type DiscountType = "nominal" | "percent";

export type ActivityAction =
  | "Membuat"
  | "Mengubah"
  | "Menghapus"
  | "Membayar"
  | "Membatalkan"
  | "Membuka";

export type ReceiptPaperSize = 58 | 80;

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  initials: string;
  role: Role;
  branchId: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  costPrice: number;
  price: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface StockLevel {
  branchId: string;
  productId: string;
  quantity: number;
  minStock: number;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface BusinessProfile {
  name: string;
  address: string;
  phone: string;
  /** Data URL / URL logo; kosong berarti memakai logo bawaan. */
  logoUrl?: string;
}

export interface PaymentSettings {
  enabledMethods: PaymentMethod[];
  bankAccounts: BankAccount[];
}

export interface ReceiptSettings {
  paperSize: ReceiptPaperSize;
  footerText: string;
}

export interface AttendanceSettings {
  /** Format HH:MM, dipakai untuk menandai telat. */
  workStartTime: string;
  workEndTime: string;
}

export type SalesBonusType = "per_piece" | "percent" | "tiered";

export interface SalesBonusTier {
  /** Target minimal pcs dalam sebulan agar tier ini berlaku. */
  minQuantity: number;
  amountPerPiece: number;
}

export interface SalesBonusSettings {
  type: SalesBonusType;
  /** Bonus tetap per pcs untuk tipe per_piece. */
  perPieceAmount: number;
  /** Persentase dari nominal penjualan untuk tipe percent. */
  percentRate: number;
  /** Tier dari target pcs terbanyak ke terkecil untuk tipe tiered. */
  tiers: SalesBonusTier[];
}

export interface StoreSettings {
  business: BusinessProfile;
  payment: PaymentSettings;
  /** Nilai lama, dipertahankan agar data fase 1 tetap terbaca. */
  salesBonusPerPiece: number;
  salesBonus: SalesBonusSettings;
  receipt: ReceiptSettings;
  attendance: AttendanceSettings;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  unitPrice: number;
  /** Harga modal saat transaksi; transaksi lama bisa belum punya nilai ini. */
  unitCost?: number;
  quantity: number;
  lineTotal: number;
}

export interface TransactionDiscount {
  type: DiscountType;
  value: number;
  amount: number;
}

export interface TransactionPayment {
  method: PaymentMethod;
  cashReceived?: number;
  change?: number;
  bankAccountId?: string;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  branchId: string;
  cashierId: string;
  salesEmployeeId: string | null;
  items: TransactionItem[];
  subtotal: number;
  discount: TransactionDiscount;
  total: number;
  payment: TransactionPayment;
  createdAt: string;
}

export interface CartDraftItem {
  productId: string;
  quantity: number;
}

export interface CartDraft {
  id: string;
  label: string;
  branchId: string;
  cashierId: string;
  salesEmployeeId: string | null;
  items: CartDraftItem[];
  discountType: DiscountType;
  discountValue: number;
  createdAt: string;
  updatedAt: string;
}

export type SalesOrderStatus =
  | "Belum sinkron"
  | "Menunggu bayar"
  | "Lunas"
  | "Dibatalkan";

export interface SalesOrderItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  branchId: string;
  salesEmployeeId: string;
  items: SalesOrderItem[];
  total: number;
  status: SalesOrderStatus;
  /** Menandai stok cabang sudah dikurangi saat pesanan dilunasi. */
  stockApplied: boolean;
  note: string;
  createdAt: string;
}

export interface StockInItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface StockInRecord {
  id: string;
  branchId: string;
  items: StockInItem[];
  date: string;
  note: string;
  userId: string;
  createdAt: string;
}

export interface StockOpnameItem {
  productId: string;
  productName: string;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
}

export interface StockOpnameRecord {
  id: string;
  branchId: string;
  items: StockOpnameItem[];
  date: string;
  note: string;
  userId: string;
  createdAt: string;
}

export interface StockTransferItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface StockTransferRecord {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  items: StockTransferItem[];
  date: string;
  note: string;
  userId: string;
  createdAt: string;
}

export type AttendanceStatus = "Hadir" | "Izin" | "Sakit" | "Alpa";

/** Status yang ditampilkan; "Telat" dihitung dari jam masuk di pengaturan. */
export type AttendanceDisplayStatus =
  | "Hadir"
  | "Telat"
  | "Izin"
  | "Sakit"
  | "Alpa"
  | "Belum absen";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  branchId: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
}

export type LeaveRequestStatus = "Menunggu" | "Disetujui" | "Ditolak";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  branchId: string;
  /** Tanggal izin (YYYY-MM-DD). */
  date: string;
  reason: string;
  status: LeaveRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  at: string;
  userId: string;
  userName: string;
  role: Role;
  branchId: string;
  action: ActivityAction;
  detail: string;
}

export interface AppSession {
  currentEmployeeId: string;
  activeBranchId: string;
}

export interface AppDatabase {
  schemaVersion: 3;
  branches: Branch[];
  employees: Employee[];
  categories: Category[];
  products: Product[];
  stocks: StockLevel[];
  stockIns: StockInRecord[];
  stockOpnames: StockOpnameRecord[];
  stockTransfers: StockTransferRecord[];
  transactions: Transaction[];
  drafts: CartDraft[];
  salesOrders: SalesOrder[];
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  settings: StoreSettings;
  activityLogs: ActivityLog[];
  session: AppSession;
}
