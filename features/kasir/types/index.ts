import type {
  BankAccount,
  Branch,
  CartDraft,
  DiscountType,
  Employee,
  ReceiptPaperSize,
  StoreSettings,
  Transaction,
} from "@/lib/store/types";
import type { PaymentMethod } from "@/types";

export interface KasirProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  categoryId: string;
  categoryName: string;
}

export interface KasirCategory {
  id: string;
  name: string;
}

export interface CartLine {
  product: KasirProduct;
  quantity: number;
}

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export interface CartTotals {
  subtotal: number;
  discountAmount: number;
  total: number;
  itemCount: number;
  totalQuantity: number;
}

export interface DraftSummary {
  draft: CartDraft;
  itemCount: number;
  total: number;
  cashierName: string;
}

export interface CashierData {
  products: KasirProduct[];
  categories: KasirCategory[];
  salesEmployees: Employee[];
  bankAccounts: BankAccount[];
  enabledMethods: PaymentMethod[];
  drafts: DraftSummary[];
  settings: StoreSettings;
  branch: Branch;
  cashier: Employee;
}

export interface CreateTransactionInput {
  items: CartItemInput[];
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  bankAccountId?: string;
  salesEmployeeId: string | null;
}

export interface SaveDraftInput {
  items: CartItemInput[];
  discountType: DiscountType;
  discountValue: number;
  salesEmployeeId: string | null;
}

export interface TransactionResult {
  transaction: Transaction;
  receipt: ReceiptViewData;
}

export interface ReceiptViewData {
  transaction: Transaction;
  branchName: string;
  branchAddress: string;
  businessName: string;
  businessPhone: string;
  cashierName: string;
  salesName: string | null;
  bankName: string | null;
  paperSize: ReceiptPaperSize;
  footerText: string;
}
