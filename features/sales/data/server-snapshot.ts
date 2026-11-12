import "server-only";

import { ROLES } from "@/constants/roles";
import { syncWindowStartIso } from "@/lib/cloud/window";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SessionState } from "@/features/session/types";
import type {
  CartDraft,
  SalesOrder,
  SalesOrderStatus,
  ShippingMethod,
  Transaction,
  TransactionItem,
} from "@/lib/store/types";
import type { SalesSnapshot } from "@/lib/cloud/sales-types";

interface TransactionItemRow {
  product_id: string | null;
  product_name: string;
  unit_price: number;
  unit_cost: number | null;
  quantity: number;
  line_total: number;
  price_type: "retail" | "wholesale";
  discount_type: "nominal" | "percent";
  discount_value: number;
  discount_amount: number;
}

export interface TransactionRow {
  id: string;
  invoice_number: string;
  branch_id: string;
  cashier_id: string;
  sales_employee_id: string | null;
  subtotal: number;
  discount_type: "nominal" | "percent";
  discount_value: number;
  discount_amount: number;
  total: number;
  tax_enabled: boolean | null;
  tax_rate: number | string | null;
  tax_amount: number | null;
  shipping_method: ShippingMethod | null;
  shipping_cost: number | null;
  payment_method: "Cash" | "QRIS" | "Transfer";
  cash_received: number | null;
  change_amount: number | null;
  bank_account_id: string | null;
  refunded_at: string | null;
  refunded_by_id: string | null;
  refunded_by_name: string | null;
  refund_reason: string | null;
  refund_amount: number | null;
  created_at: string;
  transaction_items: TransactionItemRow[] | null;
}

interface SalesOrderItemRow {
  product_id: string | null;
  product_name: string;
  unit_price: number;
  unit_cost: number | null;
  quantity: number;
  price_type: "retail" | "wholesale";
  discount_type: "nominal" | "percent";
  discount_value: number;
  discount_amount: number;
}

export interface SalesOrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  branch_id: string;
  sales_employee_id: string;
  total: number;
  tax_enabled: boolean | null;
  tax_rate: number | string | null;
  tax_amount: number | null;
  shipping_method: ShippingMethod | null;
  shipping_cost: number | null;
  status: string;
  paid_at: string | null;
  transaction_id: string | null;
  stock_applied: boolean;
  note: string;
  created_at: string;
  sales_order_items: SalesOrderItemRow[] | null;
}

interface CartDraftItemRow {
  product_id: string;
  quantity: number;
}

interface CartDraftRow {
  id: string;
  label: string;
  branch_id: string;
  cashier_id: string;
  sales_employee_id: string | null;
  discount_type: "nominal" | "percent";
  discount_value: number;
  created_at: string;
  updated_at: string;
  cart_draft_items: CartDraftItemRow[] | null;
}

export const TRANSACTION_COLUMNS =
  "id,invoice_number,branch_id,cashier_id,sales_employee_id,subtotal,discount_type,discount_value,discount_amount,total,tax_enabled,tax_rate,tax_amount,shipping_method,shipping_cost,payment_method,cash_received,change_amount,bank_account_id,refunded_at,refunded_by_id,refunded_by_name,refund_reason,refund_amount,created_at,transaction_items(product_id,product_name,unit_price,unit_cost,quantity,line_total,price_type,discount_type,discount_value,discount_amount)";

export const SALES_ORDER_COLUMNS =
  "id,order_number,customer_name,customer_phone,branch_id,sales_employee_id,total,tax_enabled,tax_rate,tax_amount,shipping_method,shipping_cost,status,paid_at,transaction_id,stock_applied,note,created_at,sales_order_items(product_id,product_name,unit_price,unit_cost,quantity,price_type,discount_type,discount_value,discount_amount)";

export const CART_DRAFT_COLUMNS =
  "id,label,branch_id,cashier_id,sales_employee_id,discount_type,discount_value,created_at,updated_at,cart_draft_items(product_id,quantity)";

export interface RangeQuery {
  /** ISO timestamp batas bawah (inklusif). */
  start?: string;
  end?: string;
  /** Paksa satu cabang; default mengikuti hak akses sesi. */
  branchId?: string;
}

function mapTransactionItem(row: TransactionItemRow): TransactionItem {
  return {
    productId: row.product_id ?? "",
    productName: row.product_name,
    unitPrice: row.unit_price,
    unitCost: row.unit_cost ?? undefined,
    quantity: row.quantity,
    lineTotal: row.line_total,
    priceType: row.price_type,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    discountAmount: row.discount_amount,
  };
}

export function mapTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    branchId: row.branch_id,
    cashierId: row.cashier_id,
    salesEmployeeId: row.sales_employee_id,
    items: (row.transaction_items ?? []).map(mapTransactionItem),
    subtotal: row.subtotal,
    discount: {
      type: row.discount_type,
      value: row.discount_value,
      amount: row.discount_amount,
    },
    total: row.total,
    taxEnabled: row.tax_enabled ?? false,
    taxRate: Number(row.tax_rate ?? 0),
    taxAmount: row.tax_amount ?? 0,
    shippingMethod: row.shipping_method ?? "pickup",
    shippingCost: row.shipping_cost ?? 0,
    payment: {
      method: row.payment_method,
      cashReceived: row.cash_received ?? undefined,
      change: row.change_amount ?? undefined,
      bankAccountId: row.bank_account_id ?? undefined,
    },
    createdAt: row.created_at,
    refund: row.refunded_at
      ? {
          at: row.refunded_at,
          byId: row.refunded_by_id ?? "",
          byName: row.refunded_by_name ?? "",
          reason: row.refund_reason ?? "",
          amount: row.refund_amount ?? 0,
        }
      : undefined,
  };
}

export function mapSalesOrderRow(row: SalesOrderRow): SalesOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    branchId: row.branch_id,
    salesEmployeeId: row.sales_employee_id,
    items: (row.sales_order_items ?? []).map((item) => ({
      productId: item.product_id ?? "",
      productName: item.product_name,
      unitPrice: item.unit_price,
      unitCost: item.unit_cost ?? undefined,
      quantity: item.quantity,
      priceType: item.price_type,
      discountType: item.discount_type,
      discountValue: item.discount_value,
      discountAmount: item.discount_amount,
    })),
    total: row.total,
    taxEnabled: row.tax_enabled ?? false,
    taxRate: Number(row.tax_rate ?? 0),
    taxAmount: row.tax_amount ?? 0,
    shippingMethod: row.shipping_method ?? "pickup",
    shippingCost: row.shipping_cost ?? 0,
    status: row.status as SalesOrderStatus,
    transactionId: row.transaction_id ?? undefined,
    paidAt: row.paid_at ?? undefined,
    stockApplied: row.stock_applied,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function mapCartDraftRow(row: CartDraftRow): CartDraft {
  return {
    id: row.id,
    label: row.label,
    branchId: row.branch_id,
    cashierId: row.cashier_id,
    salesEmployeeId: row.sales_employee_id,
    items: (row.cart_draft_items ?? []).map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
    })),
    discountType: row.discount_type,
    discountValue: row.discount_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Transaksi terbaru sesuai akses cabang dan rentang tanggal. */
export async function readTransactions(
  session: SessionState,
  query: RangeQuery = {},
): Promise<Transaction[]> {
  const admin = createSupabaseAdminClient();
  const branchId =
    query.branchId ??
    (session.permissions.canViewAllBranches ? null : session.branch.id);

  let request = admin
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .gte("created_at", query.start ?? syncWindowStartIso())
    .order("created_at", { ascending: false });

  if (query.end) request = request.lte("created_at", query.end);
  if (branchId) request = request.eq("branch_id", branchId);

  const { data, error } = await request;
  if (error) throw new Error(error.message);

  return ((data ?? []) as TransactionRow[]).map(mapTransactionRow);
}

export async function readSalesOrders(
  session: SessionState,
  query: RangeQuery = {},
): Promise<SalesOrder[]> {
  const admin = createSupabaseAdminClient();

  let request = admin
    .from("sales_orders")
    .select(SALES_ORDER_COLUMNS)
    .gte("created_at", query.start ?? syncWindowStartIso())
    .order("created_at", { ascending: false });

  // Pesanan tetap mengikuti aturan lama: hanya role Sales yang dibatasi.
  if (query.end) request = request.lte("created_at", query.end);
  if (query.branchId) request = request.eq("branch_id", query.branchId);
  if (session.employee.role === ROLES.SALES) {
    request = request.eq("sales_employee_id", session.employee.id);
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message);

  return ((data ?? []) as SalesOrderRow[]).map(mapSalesOrderRow);
}

export async function readCartDrafts(
  session: SessionState,
): Promise<CartDraft[]> {
  const admin = createSupabaseAdminClient();

  let request = admin
    .from("cart_drafts")
    .select(CART_DRAFT_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (!session.permissions.canViewAllBranches) {
    request = request.eq("branch_id", session.branch.id);
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message);

  return ((data ?? []) as CartDraftRow[]).map(mapCartDraftRow);
}

/** Snapshot penjualan untuk cache harian (dibatasi rentang sync). */
export async function readSalesSnapshot(
  session: SessionState,
): Promise<SalesSnapshot> {
  const [transactions, salesOrders, drafts] = await Promise.all([
    readTransactions(session),
    readSalesOrders(session),
    readCartDrafts(session),
  ]);

  return {
    transactions,
    salesOrders,
    drafts,
    isEmpty:
      transactions.length === 0 &&
      salesOrders.length === 0 &&
      drafts.length === 0,
  };
}
