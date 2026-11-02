import type {
  CartDraft,
  CartDraftItem,
  DiscountType,
  Employee,
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
  Transaction,
  TransactionItem,
} from "@/lib/store/types";
import type { Branch } from "@/lib/store/types";
import type { PaymentMethod } from "@/types";

export interface SalesSnapshot {
  transactions: Transaction[];
  salesOrders: SalesOrder[];
  drafts: CartDraft[];
  isEmpty: boolean;
}

export interface SalesBootstrapTransaction
  extends Omit<Transaction, "items" | "refund"> {
  items: TransactionItem[];
  refund?: {
    at: string;
    byId: string;
    byName: string;
    reason: string;
    amount: number;
  };
}

export interface SalesBootstrapOrder
  extends Omit<SalesOrder, "items"> {
  items: SalesOrderItem[];
}

export interface SalesBootstrapDraft
  extends Omit<CartDraft, "items"> {
  items: CartDraftItem[];
}

export interface SalesBootstrapPayload {
  branches: {
    id: string;
    name: string;
    address: string;
    phone: string;
    is_active: boolean;
  }[];
  employees: {
    id: string;
    name: string;
    phone: string;
    initials: string;
    role: string;
    branch_id: string;
    is_active: boolean;
  }[];
  transactions: {
    id: string;
    invoice_number: string;
    branch_id: string;
    cashier_id: string;
    sales_employee_id: string | null;
    subtotal: number;
    discount_type: DiscountType;
    discount_value: number;
    discount_amount: number;
    total: number;
    payment_method: PaymentMethod;
    cash_received: number | null;
    change_amount: number | null;
    bank_account_id: string | null;
    refunded_at: string | null;
    refunded_by_id: string | null;
    refunded_by_name: string | null;
    refund_reason: string | null;
    refund_amount: number | null;
    created_at: string;
    items: {
      product_id: string;
      product_name: string;
      unit_price: number;
      unit_cost: number | null;
      quantity: number;
      line_total: number;
    }[];
  }[];
  sales_orders: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    branch_id: string;
    sales_employee_id: string;
    total: number;
    status: SalesOrderStatus;
    paid_at: string | null;
    stock_applied: boolean;
    note: string;
    created_at: string;
    items: {
      product_id: string;
      product_name: string;
      unit_price: number;
      unit_cost: number | null;
      quantity: number;
    }[];
  }[];
  drafts: {
    id: string;
    label: string;
    branch_id: string;
    cashier_id: string;
    sales_employee_id: string | null;
    discount_type: DiscountType;
    discount_value: number;
    created_at: string;
    updated_at: string;
    items: { product_id: string; quantity: number }[];
  }[];
}

export interface CreateTransactionPayload {
  branchId: string;
  cashierId: string;
  salesEmployeeId: string | null;
  items: { productId: string; quantity: number }[];
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  bankAccountId?: string;
}

export interface CreateSalesOrderPayload {
  branchId: string;
  salesEmployeeId: string;
  customerName: string;
  customerPhone: string;
  note: string;
  items: { productId: string; quantity: number }[];
}

export interface SaveDraftPayload {
  branchId: string;
  cashierId: string;
  salesEmployeeId: string | null;
  label: string;
  discountType: DiscountType;
  discountValue: number;
  items: { productId: string; quantity: number }[];
}

export type SalesDataResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type SalesWriteResult =
  | { ok: true }
  | { ok: false; error: string };

export interface SalesBootstrapInput {
  branches: Branch[];
  employees: Employee[];
  transactions: SalesBootstrapTransaction[];
  salesOrders: SalesBootstrapOrder[];
  drafts: SalesBootstrapDraft[];
}
