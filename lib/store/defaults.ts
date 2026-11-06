import type {
  AppDatabase,
  AttendanceSettings,
  SalesBonusSettings,
  StoreSettings,
} from "@/lib/store/types";

export const DEFAULT_ATTENDANCE: AttendanceSettings = {
  workStartTime: "08:00",
  workEndTime: "17:00",
};

export const DEFAULT_SALES_BONUS: SalesBonusSettings = {
  type: "per_piece",
  perPieceAmount: 5_000,
  percentRate: 2.5,
  tiers: [
    { minQuantity: 200, amountPerPiece: 7_500 },
    { minQuantity: 100, amountPerPiece: 6_000 },
    { minQuantity: 0, amountPerPiece: 5_000 },
  ],
};

/** Pengaturan netral sebelum snapshot cloud pertama masuk. */
export const EMPTY_SETTINGS: StoreSettings = {
  business: {
    name: "",
    address: "",
    phone: "",
  },
  payment: {
    enabledMethods: ["Cash"],
    bankAccounts: [],
  },
  salesBonusPerPiece: 0,
  salesBonus: DEFAULT_SALES_BONUS,
  receipt: {
    paperSize: 80,
    footerText: "",
  },
  attendance: DEFAULT_ATTENDANCE,
};

/**
 * Cache tampilan kosong. Supabase adalah satu-satunya sumber data, jadi tidak
 * ada data demo yang boleh tampil sebelum snapshot cloud masuk.
 */
export function createEmptyDatabase(): AppDatabase {
  return {
    schemaVersion: 3,
    branches: [],
    employees: [],
    categories: [],
    products: [],
    stocks: [],
    stockIns: [],
    stockOpnames: [],
    stockTransfers: [],
    transactions: [],
    drafts: [],
    salesOrders: [],
    attendance: [],
    leaveRequests: [],
    activityLogs: [],
    settings: EMPTY_SETTINGS,
    session: {
      currentEmployeeId: "",
      activeBranchId: "",
    },
  };
}
