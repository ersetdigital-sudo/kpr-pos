import type {
  ActivityLog,
  AppSession,
  AttendanceRecord,
  Branch,
  CartDraft,
  Category,
  Customer,
  Employee,
  Kasbon,
  LeaveRequest,
  Product,
  SalesOrder,
  StockInRecord,
  StockLevel,
  StockOpnameRecord,
  StockTransferRecord,
  StoreSettings,
  Transaction,
} from "@/lib/store/types";

/**
 * Satu payload berisi seluruh data yang dibutuhkan cache tampilan. Field yang
 * tidak diizinkan untuk role user dikirim sebagai array kosong.
 */
export interface AppSnapshot {
  fetchedAt: string;
  session: AppSession;
  settings: StoreSettings | null;
  branches: Branch[];
  employees: Employee[];
  categories: Category[];
  products: Product[];
  stocks: StockLevel[];
  stockIns: StockInRecord[];
  stockOpnames: StockOpnameRecord[];
  stockTransfers: StockTransferRecord[];
  transactions: Transaction[];
  salesOrders: SalesOrder[];
  drafts: CartDraft[];
  customers: Customer[];
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  kasbon: Kasbon[];
  activityLogs: ActivityLog[];
}
