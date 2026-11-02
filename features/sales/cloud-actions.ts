"use server";

import { ROLES } from "@/constants/roles";
import { getAuthSession, getAuthorizedSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CloudActionResult,
  CloudBootstrapResult,
} from "@/lib/cloud/result";
import type {
  CartDraft,
  SalesOrder,
  SalesOrderStatus,
  Transaction,
  TransactionItem,
  SalesOrderItem,
  CartDraftItem,
} from "@/lib/store/types";
import type {
  CreateSalesOrderPayload,
  CreateTransactionPayload,
  SalesBootstrapPayload,
  SalesDataResult,
  SalesSnapshot,
  SaveDraftPayload,
} from "@/lib/cloud/sales-types";
import type { SessionState } from "@/features/session/types";

interface TransactionItemRow {
  product_id: string | null;
  product_name: string;
  unit_price: number;
  unit_cost: number | null;
  quantity: number;
  line_total: number;
}

interface TransactionRow {
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
}

interface SalesOrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  branch_id: string;
  sales_employee_id: string;
  total: number;
  status: string;
  paid_at: string | null;
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

interface TransactionJson {
  id: string;
  invoiceNumber: string;
  branchId: string;
  cashierId: string;
  salesEmployeeId: string | null;
  subtotal: number;
  discount: { type: "nominal" | "percent"; value: number; amount: number };
  total: number;
  payment: {
    method: "Cash" | "QRIS" | "Transfer";
    cashReceived: number | null;
    change: number | null;
    bankAccountId: string | null;
  };
  createdAt: string;
  items: {
    productId: string | null;
    productName: string;
    unitPrice: number;
    unitCost: number | null;
    quantity: number;
    lineTotal: number;
  }[];
  refund: {
    at: string;
    byId: string;
    byName: string;
    reason: string;
    amount: number;
  } | null;
}

interface SalesOrderJson {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  branchId: string;
  salesEmployeeId: string;
  total: number;
  status: string;
  paidAt: string | null;
  stockApplied: boolean;
  note: string;
  createdAt: string;
  items: {
    productId: string | null;
    productName: string;
    unitPrice: number;
    unitCost: number | null;
    quantity: number;
  }[];
}

interface CartDraftJson {
  id: string;
  label: string;
  branchId: string;
  cashierId: string;
  salesEmployeeId: string | null;
  discountType: "nominal" | "percent";
  discountValue: number;
  createdAt: string;
  updatedAt: string;
  items: { productId: string; quantity: number }[];
}

function fail(message: string): { ok: false; error: string } {
  return { ok: false, error: message };
}

function canAccessBranch(session: SessionState, branchId: string): boolean {
  return (
    session.permissions.canViewAllBranches ||
    session.employee.branchId === branchId
  );
}

function mapTransactionItem(row: TransactionItemRow): TransactionItem {
  return {
    productId: row.product_id ?? "",
    productName: row.product_name,
    unitPrice: row.unit_price,
    unitCost: row.unit_cost ?? undefined,
    quantity: row.quantity,
    lineTotal: row.line_total,
  };
}

function mapTransaction(row: TransactionRow): Transaction {
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

function mapOrderItem(row: SalesOrderItemRow): SalesOrderItem {
  return {
    productId: row.product_id ?? "",
    productName: row.product_name,
    unitPrice: row.unit_price,
    unitCost: row.unit_cost ?? undefined,
    quantity: row.quantity,
  };
}

function mapSalesOrder(row: SalesOrderRow): SalesOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    branchId: row.branch_id,
    salesEmployeeId: row.sales_employee_id,
    items: (row.sales_order_items ?? []).map(mapOrderItem),
    total: row.total,
    status: row.status as SalesOrderStatus,
    paidAt: row.paid_at ?? undefined,
    stockApplied: row.stock_applied,
    note: row.note,
    createdAt: row.created_at,
  };
}

function mapDraftItem(row: CartDraftItemRow): CartDraftItem {
  return { productId: row.product_id, quantity: row.quantity };
}

function mapDraft(row: CartDraftRow): CartDraft {
  return {
    id: row.id,
    label: row.label,
    branchId: row.branch_id,
    cashierId: row.cashier_id,
    salesEmployeeId: row.sales_employee_id,
    items: (row.cart_draft_items ?? []).map(mapDraftItem),
    discountType: row.discount_type,
    discountValue: row.discount_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTransactionJson(row: TransactionJson): Transaction {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    branchId: row.branchId,
    cashierId: row.cashierId,
    salesEmployeeId: row.salesEmployeeId,
    items: row.items.map((item) => ({
      productId: item.productId ?? "",
      productName: item.productName,
      unitPrice: item.unitPrice,
      unitCost: item.unitCost ?? undefined,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal: row.subtotal,
    discount: row.discount,
    total: row.total,
    payment: {
      method: row.payment.method,
      cashReceived: row.payment.cashReceived ?? undefined,
      change: row.payment.change ?? undefined,
      bankAccountId: row.payment.bankAccountId ?? undefined,
    },
    createdAt: row.createdAt,
    refund: row.refund ?? undefined,
  };
}

function mapSalesOrderJson(row: SalesOrderJson): SalesOrder {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    branchId: row.branchId,
    salesEmployeeId: row.salesEmployeeId,
    items: row.items.map((item) => ({
      productId: item.productId ?? "",
      productName: item.productName,
      unitPrice: item.unitPrice,
      unitCost: item.unitCost ?? undefined,
      quantity: item.quantity,
    })),
    total: row.total,
    status: row.status as SalesOrderStatus,
    paidAt: row.paidAt ?? undefined,
    stockApplied: row.stockApplied,
    note: row.note,
    createdAt: row.createdAt,
  };
}

function mapDraftJson(row: CartDraftJson): CartDraft {
  return {
    id: row.id,
    label: row.label,
    branchId: row.branchId,
    cashierId: row.cashierId,
    salesEmployeeId: row.salesEmployeeId,
    items: row.items,
    discountType: row.discountType,
    discountValue: row.discountValue,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function readSnapshot(session: SessionState): Promise<SalesSnapshot> {
  const admin = createSupabaseAdminClient();
  const permissions = session.permissions;

  const [transactionResult, orderResult, draftResult] = await Promise.all([
    admin
      .from("transactions")
      .select(
        "id,invoice_number,branch_id,cashier_id,sales_employee_id,subtotal,discount_type,discount_value,discount_amount,total,payment_method,cash_received,change_amount,bank_account_id,refunded_at,refunded_by_id,refunded_by_name,refund_reason,refund_amount,created_at,transaction_items(product_id,product_name,unit_price,unit_cost,quantity,line_total)",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("sales_orders")
      .select(
        "id,order_number,customer_name,customer_phone,branch_id,sales_employee_id,total,status,paid_at,stock_applied,note,created_at,sales_order_items(product_id,product_name,unit_price,unit_cost,quantity)",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("cart_drafts")
      .select(
        "id,label,branch_id,cashier_id,sales_employee_id,discount_type,discount_value,created_at,updated_at,cart_draft_items(product_id,quantity)",
      )
      .order("updated_at", { ascending: false }),
  ]);

  const error =
    transactionResult.error ?? orderResult.error ?? draftResult.error;
  if (error) throw new Error(error.message);

  const transactionRows = (transactionResult.data ?? []) as TransactionRow[];
  const orderRows = (orderResult.data ?? []) as SalesOrderRow[];
  const draftRows = (draftResult.data ?? []) as CartDraftRow[];

  const transactions = transactionRows
    .filter(
      (row) =>
        permissions.canViewAllBranches || row.branch_id === session.branch.id,
    )
    .map(mapTransaction);

  const salesOrders = orderRows
    .filter(
      (row) =>
        session.employee.role !== ROLES.SALES ||
        row.sales_employee_id === session.employee.id,
    )
    .map(mapSalesOrder);

  const drafts = draftRows
    .filter(
      (row) =>
        permissions.canViewAllBranches || row.branch_id === session.branch.id,
    )
    .map(mapDraft);

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

export async function fetchSalesSnapshotAction(): Promise<SalesSnapshot> {
  const session = await getAuthSession();
  if (!session) throw new Error("Sesi pengguna tidak ditemukan");
  return readSnapshot(session);
}

export async function bootstrapSalesAction(
  payload: SalesBootstrapPayload,
): Promise<CloudBootstrapResult> {
  const session = await getAuthorizedSession("canManageSalesOrders");
  if (!session) {
    return { ok: false, error: "Anda tidak punya akses memindahkan penjualan." };
  }

  const result = await callServiceRpc<boolean>("fn_bootstrap_sales", {
    p_payload: payload,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, bootstrapped: result.data === true };
}

export async function createTransactionAction(
  payload: CreateTransactionPayload,
): Promise<SalesDataResult<Transaction>> {
  const session = await getAuthSession();
  if (!session) return fail("Sesi pengguna tidak ditemukan");
  if (!canAccessBranch(session, payload.branchId)) {
    return fail("Cabang tidak sesuai akses Anda.");
  }

  const result = await callServiceRpc<TransactionJson>("fn_create_transaction", {
    p_payload: { ...payload, cashierId: session.employee.id },
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Transaksi gagal disimpan" : result.error);
  }

  return { ok: true, data: mapTransactionJson(result.data) };
}

export async function refundTransactionAction(
  transactionId: string,
  reason: string,
): Promise<SalesDataResult<Transaction>> {
  const session = await getAuthorizedSession("canCancelTransaction");
  if (!session) return fail("Role Anda tidak boleh membatalkan transaksi");

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("transactions")
    .select("branch_id")
    .eq("id", transactionId)
    .maybeSingle();

  if (error || !row) return fail("Transaksi tidak ditemukan");
  if (!canAccessBranch(session, row.branch_id as string)) {
    return fail("Cabang tidak sesuai akses Anda.");
  }

  const result = await callServiceRpc<TransactionJson>("fn_refund_transaction", {
    p_transaction_id: transactionId,
    p_user_id: session.employee.id,
    p_reason: reason,
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Refund gagal diproses" : result.error);
  }

  return { ok: true, data: mapTransactionJson(result.data) };
}

export async function createSalesOrderAction(
  payload: CreateSalesOrderPayload,
): Promise<SalesDataResult<SalesOrder>> {
  const session = await getAuthorizedSession("canCreateSalesOrder");
  if (!session) return fail("Role Anda tidak boleh membuat pesanan");
  if (!canAccessBranch(session, payload.branchId)) {
    return fail("Cabang tidak sesuai akses Anda.");
  }

  const salesEmployeeId =
    session.employee.role === ROLES.SALES
      ? session.employee.id
      : payload.salesEmployeeId;

  const result = await callServiceRpc<SalesOrderJson>("fn_create_sales_order", {
    p_payload: { ...payload, salesEmployeeId },
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Pesanan gagal disimpan" : result.error);
  }

  return { ok: true, data: mapSalesOrderJson(result.data) };
}

export async function updateSalesOrderStatusAction(
  orderId: string,
  status: SalesOrderStatus,
): Promise<SalesDataResult<SalesOrder>> {
  const session = await getAuthorizedSession("canManageSalesOrders");
  if (!session) return fail("Role Anda tidak boleh mengubah status pesanan");

  const result = await callServiceRpc<SalesOrderJson>(
    "fn_update_sales_order_status",
    {
      p_order_id: orderId,
      p_status: status,
      p_user_id: session.employee.id,
    },
  );

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Status gagal diubah" : result.error);
  }

  return { ok: true, data: mapSalesOrderJson(result.data) };
}

export async function deleteSalesOrderAction(
  orderId: string,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageSalesOrders");
  if (!session) return fail("Role Anda tidak boleh menghapus pesanan");

  if (!session.permissions.canDeleteSalesOrder) {
    return fail("Role Anda tidak boleh menghapus pesanan");
  }

  const result = await callServiceRpc("fn_delete_sales_order", {
    p_order_id: orderId,
  });

  return result.ok ? { ok: true } : fail(result.error);
}

export async function saveDraftAction(
  payload: SaveDraftPayload,
): Promise<SalesDataResult<CartDraft>> {
  const session = await getAuthSession();
  if (!session) return fail("Sesi pengguna tidak ditemukan");
  if (!canAccessBranch(session, payload.branchId)) {
    return fail("Cabang tidak sesuai akses Anda.");
  }

  const result = await callServiceRpc<CartDraftJson>("fn_save_cart_draft", {
    p_payload: { ...payload, cashierId: session.employee.id },
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Draft gagal disimpan" : result.error);
  }

  return { ok: true, data: mapDraftJson(result.data) };
}

export async function takeDraftAction(
  draftId: string,
): Promise<SalesDataResult<CartDraft>> {
  const session = await getAuthSession();
  if (!session) return fail("Sesi pengguna tidak ditemukan");

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("cart_drafts")
    .select("branch_id")
    .eq("id", draftId)
    .maybeSingle();

  if (error || !row) return fail("Draft tidak ditemukan");
  if (!canAccessBranch(session, row.branch_id as string)) {
    return fail("Cabang tidak sesuai akses Anda.");
  }

  const result = await callServiceRpc<CartDraftJson>("fn_take_cart_draft", {
    p_draft_id: draftId,
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Draft tidak ditemukan" : result.error);
  }

  return { ok: true, data: mapDraftJson(result.data) };
}

export async function deleteDraftAction(
  draftId: string,
): Promise<CloudActionResult> {
  const session = await getAuthSession();
  if (!session) return fail("Sesi pengguna tidak ditemukan");

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("cart_drafts")
    .select("branch_id")
    .eq("id", draftId)
    .maybeSingle();

  if (error || !row) return fail("Draft tidak ditemukan");
  if (!canAccessBranch(session, row.branch_id as string)) {
    return fail("Cabang tidak sesuai akses Anda.");
  }

  const result = await callServiceRpc("fn_delete_cart_draft", {
    p_draft_id: draftId,
  });

  return result.ok ? { ok: true } : fail(result.error);
}
