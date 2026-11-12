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
  SalesPaymentScheme,
  ShippingMethod,
  Transaction,
} from "@/lib/store/types";
import type {
  CreateSalesOrderPayload,
  CreateTransactionPayload,
  ProcessCreditOrderPayload,
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
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  shippingMethod: ShippingMethod;
  shippingCost: number;
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
    priceType: "retail" | "wholesale";
    discountType: "nominal" | "percent";
    discountValue: number;
    discountAmount: number;
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
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  shippingMethod: ShippingMethod;
  shippingCost: number;
  status: string;
  customerId: string | null;
  paymentScheme: SalesPaymentScheme | null;
  tempoDays: number | null;
  dueDate: string | null;
  processedAt: string | null;
  paidAt: string | null;
  settledByName: string | null;
  transactionId: string | null;
  stockApplied: boolean;
  note: string;
  createdAt: string;
  items: {
    productId: string | null;
    productName: string;
    unitPrice: number;
    unitCost: number | null;
    quantity: number;
    priceType: "retail" | "wholesale";
    discountType: "nominal" | "percent";
    discountValue: number;
    discountAmount: number;
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
      priceType: item.priceType,
      discountType: item.discountType,
      discountValue: item.discountValue,
      discountAmount: item.discountAmount,
    })),
    subtotal: row.subtotal,
    discount: row.discount,
    total: row.total,
    taxEnabled: row.taxEnabled ?? false,
    taxRate: row.taxRate ?? 0,
    taxAmount: row.taxAmount ?? 0,
    shippingMethod: row.shippingMethod ?? "pickup",
    shippingCost: row.shippingCost ?? 0,
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
      priceType: item.priceType,
      discountType: item.discountType,
      discountValue: item.discountValue,
      discountAmount: item.discountAmount,
    })),
    total: row.total,
    taxEnabled: row.taxEnabled ?? false,
    taxRate: row.taxRate ?? 0,
    taxAmount: row.taxAmount ?? 0,
    shippingMethod: row.shippingMethod ?? "pickup",
    shippingCost: row.shippingCost ?? 0,
    status: row.status as SalesOrderStatus,
    customerId: row.customerId ?? undefined,
    paymentScheme: row.paymentScheme ?? "cash",
    tempoDays: row.tempoDays ?? undefined,
    dueDate: row.dueDate ?? undefined,
    processedAt: row.processedAt ?? undefined,
    transactionId: row.transactionId ?? undefined,
    paidAt: row.paidAt ?? undefined,
    settledByName: row.settledByName || undefined,
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
  const session = await getAuthSession();
  if (!session) return fail("Sesi pengguna tidak ditemukan");

  if (
    !session.permissions.canDeleteSalesOrder &&
    !session.permissions.canDeleteTransaction
  ) {
    return fail("Role Anda tidak boleh menghapus pesanan");
  }

  const result = await callServiceRpc("fn_delete_sales_order_safe", {
    p_order_id: orderId,
    p_actor_id: session.employee.id,
  });

  return result.ok ? { ok: true } : fail(result.error);
}

/** Proses pesanan sebagai COD atau Tempo; stok keluar saat ini juga. */
export async function processCreditOrderAction(
  payload: ProcessCreditOrderPayload,
): Promise<SalesDataResult<SalesOrder>> {
  const session = await getAuthSession();
  if (!session) return fail("Sesi pengguna tidak ditemukan");
  if (
    !session.permissions.canUseCashier &&
    !session.permissions.canManageSalesOrders
  ) {
    return fail("Role Anda tidak boleh memproses pembayaran pesanan");
  }

  if (payload.method === "tempo") {
    if (!payload.customerId) return fail("Pilih pelanggan yang boleh tempo");
    if (!payload.tempoDays) return fail("Pilih tenor tempo");
  }

  const result = await callServiceRpc<SalesOrderJson>(
    "fn_process_sales_order_credit",
    {
      p_payload: {
        orderId: payload.orderId,
        method: payload.method,
        tempoDays: payload.method === "tempo" ? payload.tempoDays : null,
        customerId:
          payload.method === "tempo" ? payload.customerId : null,
        actorId: session.employee.id,
      },
    },
  );

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Pesanan gagal diproses" : result.error);
  }

  return { ok: true, data: mapSalesOrderJson(result.data) };
}

/** Tandai lunas COD/Tempo; pemasukan Buku Kas dihitung dari paid_at. */
export async function settleCreditOrderAction(
  orderId: string,
): Promise<SalesDataResult<SalesOrder>> {
  const session = await getAuthSession();
  if (!session) return fail("Sesi pengguna tidak ditemukan");

  if (
    !session.permissions.canSettleCod &&
    !session.permissions.canSettleTempo
  ) {
    return fail("Role Anda tidak boleh menandai lunas COD/Tempo");
  }

  const result = await callServiceRpc<SalesOrderJson>(
    "fn_settle_sales_order_credit",
    {
      p_order_id: orderId,
      p_actor_id: session.employee.id,
    },
  );

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Pesanan gagal ditandai lunas" : result.error);
  }

  return { ok: true, data: mapSalesOrderJson(result.data) };
}

/** Batalkan COD/Tempo; stok dikembalikan satu kali oleh RPC. */
export async function cancelCreditOrderAction(
  orderId: string,
  reason: string,
): Promise<SalesDataResult<SalesOrder>> {
  const session = await getAuthSession();
  if (!session) return fail("Sesi pengguna tidak ditemukan");

  if (
    !session.permissions.canManageSalesOrders &&
    !session.permissions.canSettleCod &&
    !session.permissions.canSettleTempo
  ) {
    return fail("Role Anda tidak boleh membatalkan COD/Tempo");
  }

  const result = await callServiceRpc<SalesOrderJson>(
    "fn_cancel_sales_order_credit",
    {
      p_order_id: orderId,
      p_actor_id: session.employee.id,
      p_reason: reason,
    },
  );

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Pesanan gagal dibatalkan" : result.error);
  }

  return { ok: true, data: mapSalesOrderJson(result.data) };
}

/** Hapus transaksi kasir beserta pesanan terkait (khusus role berizin). */
export async function deleteTransactionOwnerAction(
  transactionId: string,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canDeleteTransaction");
  if (!session) return fail("Role Anda tidak boleh menghapus transaksi");

  const result = await callServiceRpc("fn_delete_transaction_safe", {
    p_transaction_id: transactionId,
    p_actor_id: session.employee.id,
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
