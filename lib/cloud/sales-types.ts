import type {
  CartDraft,
  DiscountType,
  SalesOrder,
  Transaction,
} from "@/lib/store/types";
import type { PaymentMethod } from "@/types";

export interface SalesSnapshot {
  transactions: Transaction[];
  salesOrders: SalesOrder[];
  drafts: CartDraft[];
  isEmpty: boolean;
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

