import type {
  BankAccount,
  Branch,
  CartDraft,
  DiscountType,
  Employee,
  PriceType,
  ReceiptPaperSize,
  SalesOrder,
  ShippingMethod,
  StoreSettings,
  Transaction,
} from "@/lib/store/types";
import type { PaymentMethod } from "@/types";

export interface KasirProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  wholesalePrice: number;
  costPrice: number;
  stock: number;
  categoryId: string;
  categoryName: string;
  imageUrl?: string;
}

export interface KasirCategory {
  id: string;
  name: string;
}

export interface CartLine {
  product: KasirProduct;
  quantity: number;
  priceType: PriceType;
  discountType: DiscountType;
  discountValue: number;
}

export interface CartItemInput {
  productId: string;
  quantity: number;
  priceType?: PriceType;
  discountType?: DiscountType;
  discountValue?: number;
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
  transactions: TransactionHistoryRow[];
  salesOrders: SalesOrder[];
  employees: Employee[];
  settings: StoreSettings;
  branch: Branch;
  cashier: Employee;
}

export interface CreateTransactionInput {
  items: CartItemInput[];
  paymentMethod: PaymentMethod;
  cashReceived: number;
  bankAccountId?: string;
  salesEmployeeId: string | null;
  /** Diisi bila pembayaran berasal dari pesanan sales. */
  salesOrderId?: string;
  taxEnabled: boolean;
  taxRate: number;
  shippingMethod: ShippingMethod;
  shippingCost: number;
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

export interface TransactionHistoryRow {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  cashierName: string;
  itemCount: number;
  method: PaymentMethod;
  total: number;
  isRefunded: boolean;
  refundedAt: string | null;
  refundedByName: string | null;
  refundReason: string | null;
}

export interface RefundTransactionInput {
  transactionId: string;
  reason: string;
}

export interface RefundTransactionResult {
  transaction: Transaction;
  refundedAmount: number;
}

export interface ReceiptViewData {
  transaction: Transaction;
  branchName: string;
  branchAddress: string;
  businessName: string;
  businessPhone: string;
  logoUrl?: string;
  cashierName: string;
  salesName: string | null;
  bankName: string | null;
  customerName?: string | null;
  note?: string | null;
  paperSize: ReceiptPaperSize;
  footerText: string;
}
