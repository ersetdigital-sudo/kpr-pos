"use server";

import { ROLES } from "@/constants/roles";
import {
  getAuthSession,
  getAuthorizedSession,
  getReadSession,
} from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import { syncWindowStartIso } from "@/lib/cloud/window";
import { readTransactions } from "@/features/sales/data/server-snapshot";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CloudActionResult } from "@/lib/cloud/result";
import type {
  CartDraft,
  SalesOrder,
  SalesOrderStatus,
  Transaction,
} from "@/lib/store/types";
import type {
  CreateSalesOrderPayload,
  CreateTransactionPayload,
  SalesDataResult,
  SaveDraftPayload,
} from "@/lib/cloud/sales-types";
import type { SessionState } from "@/features/session/types";

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

/**
 * Riwayat transaksi satu cabang, diambil langsung dari server untuk rentang
 * terakhir — bukan dari snapshot sync harian.
 */
export async function fetchTransactionHistoryAction(
  branchId: string,
  days = 30,
): Promise<Transaction[]> {
  const session = await getReadSession();
  if (!session) throw new Error("Sesi pengguna tidak ditemukan");

  if (!session.permissions.canViewAllBranches && session.branch.id !== branchId) {
    throw new Error("Cabang tidak sesuai akses Anda.");
  }

  return readTransactions(session, {
    branchId,
    start: syncWindowStartIso(days),
  });
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
