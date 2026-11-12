import type { Role } from "@/constants/roles";
import type { PaymentMethod } from "@/types";

export type DiscountType = "nominal" | "percent";

/** Pengiriman: ambil di toko, ongkir dibayar pelanggan, atau gratis ongkir. */
export type ShippingMethod = "pickup" | "paid" | "free";

/** Harga ecer (retail) atau grosir per item. */
export type PriceType = "retail" | "wholesale";

export type ActivityAction =
  | "Membuat"
  | "Mengubah"
  | "Menghapus"
  | "Membayar"
  | "Membatalkan"
  | "Refund"
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
  /** 0 berarti produk tidak punya harga grosir khusus. */
  wholesalePrice?: number;
  /** URL siap pakai untuk ditampilkan. */
  imageUrl?: string;
  /** Nilai mentah image_url di database (key R2 atau URL lama). */
  imageKey?: string;
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
  /** Tarif PPN default dalam persen (awal 11). */
  taxRate: number;
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
  /** Kosong pada transaksi lama yang dibuat sebelum diskon per item. */
  priceType?: PriceType;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
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

export interface TransactionRefund {
  at: string;
  byId: string;
  byName: string;
  reason: string;
  /** Nominal yang dikembalikan ke pembeli (sama dengan total transaksi). */
  amount: number;
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
  /** Total bayar final: dasar + PPN + ongkir. */
  total: number;
  /** PPN hanya aktif bila dipilih saat transaksi. */
  taxEnabled: boolean;
  /** Snapshot tarif PPN dalam persen; 0 bila tidak dipakai. */
  taxRate: number;
  taxAmount: number;
  shippingMethod: ShippingMethod;
  shippingCost: number;
  payment: TransactionPayment;
  createdAt: string;
  /** Terisi bila transaksi sudah dibatalkan dan stoknya dikembalikan. */
  refund?: TransactionRefund;
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
  /** Harga modal saat pesanan dibuat; pesanan lama bisa belum punya nilai ini. */
  unitCost?: number;
  quantity: number;
  priceType?: PriceType;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  branchId: string;
  salesEmployeeId: string;
  items: SalesOrderItem[];
  /** Total bayar final: dasar + PPN + ongkir. */
  total: number;
  taxEnabled: boolean;
  /** Snapshot tarif PPN saat pesanan dibuat. */
  taxRate: number;
  taxAmount: number;
  shippingMethod: ShippingMethod;
  shippingCost: number;
  status: SalesOrderStatus;
  /** Transaksi kasir yang melunasi pesanan ini, bila ada. */
  transactionId?: string;
  /** Waktu pesanan berubah menjadi Lunas; kosong untuk status lainnya. */
  paidAt?: string;
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

export type KasbonStatus =
  | "Menunggu Accounting"
  | "Menunggu Manager"
  | "Menunggu Owner"
  | "Disetujui"
  | "Ditolak"
  | "Lunas";

export type KasbonStage = "Accounting" | "Manager" | "Owner";

export type KasbonDecision = "Disetujui" | "Ditolak";

export type KasbonRepaymentMethod = "potong_gaji" | "tempo";

export type KasbonTempoUnit = "hari" | "minggu";

/** Jejak satu tahap persetujuan kasbon. */
export interface KasbonApproval {
  id: string;
  stage: KasbonStage;
  decision: KasbonDecision;
  note: string;
  decidedById: string | null;
  decidedByName: string;
  decidedAt: string;
}

export interface Kasbon {
  id: string;
  employeeId: string;
  branchId: string;
  amount: number;
  reason: string;
  repaymentMethod: KasbonRepaymentMethod;
  /** Jumlah tempo; null untuk metode potong gaji. */
  tempoValue: number | null;
  tempoUnit: KasbonTempoUnit | null;
  /** Diisi saat Owner menyetujui; sebelum itu hanya estimasi di UI. */
  dueDate: string | null;
  status: KasbonStatus;
  rejectionReason: string;
  approvedAt: string | null;
  settledAt: string | null;
  settledById: string | null;
  settledByName: string;
  approvals: KasbonApproval[];
  createdAt: string;
  updatedAt: string;
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
  kasbon: Kasbon[];
  settings: StoreSettings;
  activityLogs: ActivityLog[];
  session: AppSession;
}
