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
}

export interface PaymentSettings {
  enabledMethods: PaymentMethod[];
  bankAccounts: BankAccount[];
}

export interface ReceiptSettings {
  paperSize: ReceiptPaperSize;
  footerText: string;
}

export interface StoreSettings {
  business: BusinessProfile;
  payment: PaymentSettings;
  salesBonusPerPiece: number;
  receipt: ReceiptSettings;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  unitPrice: number;
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

export type SalesOrderStatus = "Belum sinkron" | "Menunggu bayar" | "Lunas";

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
  note: string;
  createdAt: string;
}

export type AttendanceStatus = "Hadir" | "Izin" | "Sakit" | "Alpa";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  branchId: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
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
  schemaVersion: 1;
  branches: Branch[];
  employees: Employee[];
  categories: Category[];
  products: Product[];
  stocks: StockLevel[];
  transactions: Transaction[];
  drafts: CartDraft[];
  salesOrders: SalesOrder[];
  attendance: AttendanceRecord[];
  settings: StoreSettings;
  activityLogs: ActivityLog[];
  session: AppSession;
}
