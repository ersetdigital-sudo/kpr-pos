import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  SALES_ORDER_COLUMNS,
  TRANSACTION_COLUMNS,
  mapSalesOrderRow,
  mapTransactionRow,
  type SalesOrderRow,
  type TransactionRow,
} from "@/features/sales/data/server-snapshot";
import type { SalesOrder, Transaction } from "@/lib/store/types";
import { resolveCashBookRange } from "@/features/buku-kas/data/calculations";
import type {
  CashBookBranch,
  CashBookCategory,
  CashBookEntry,
  CashBookQuery,
  CashBookType,
} from "@/features/buku-kas/types";

/** Pesanan sales dicari lebih mundur karena tanggal lunas bisa lebih baru. */
const ORDER_LOOKBACK_MS = 60 * 24 * 60 * 60 * 1000;

interface CashBookCategoryRow {
  id: string;
  type: string;
  name: string;
  is_active: boolean;
}

interface CashBookEntryRow {
  id: string;
  branch_id: string;
  type: string;
  category_id: string;
  amount: number;
  description: string;
  entry_date: string;
  created_by: string | null;
  created_by_name: string;
  is_automatic: boolean;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

interface BranchRow {
  id: string;
  name: string;
}

const CATEGORY_COLUMNS = "id,type,name,is_active";
const ENTRY_COLUMNS =
  "id,branch_id,type,category_id,amount,description,entry_date,created_by,created_by_name,is_automatic,source_type,source_id,created_at,updated_at";

function mapCategoryRow(row: CashBookCategoryRow): CashBookCategory {
  return {
    id: row.id,
    type: row.type as CashBookType,
    name: row.name,
    isActive: row.is_active,
  };
}

function mapEntryRow(row: CashBookEntryRow): CashBookEntry {
  return {
    id: row.id,
    branchId: row.branch_id,
    type: row.type as CashBookType,
    categoryId: row.category_id,
    amount: row.amount,
    description: row.description,
    entryDate: row.entry_date,
    createdById: row.created_by,
    createdByName: row.created_by_name,
    isAutomatic: row.is_automatic,
    sourceType: row.source_type,
    sourceId: row.source_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function readCashBookCategories(): Promise<CashBookCategory[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("cash_book_categories")
    .select(CATEGORY_COLUMNS)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as CashBookCategoryRow[]).map(mapCategoryRow);
}

export async function readCashBookBranches(): Promise<CashBookBranch[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("branches")
    .select("id,name")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as BranchRow[];
}

/** Entri manual pada rentang tanggal; branchId null berarti semua cabang. */
export async function readCashBookEntries(
  query: CashBookQuery,
  branchId: string | null,
): Promise<CashBookEntry[]> {
  const range = resolveCashBookRange(query);
  const admin = createSupabaseAdminClient();

  let request = admin
    .from("cash_book_entries")
    .select(ENTRY_COLUMNS)
    .gte("entry_date", range.startDate)
    .lte("entry_date", range.endDate)
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (branchId) request = request.eq("branch_id", branchId);

  const { data, error } = await request;
  if (error) throw new Error(error.message);

  return ((data ?? []) as CashBookEntryRow[]).map(mapEntryRow);
}

/**
 * Penjualan pada periode terpilih. Aturan sumbernya sama dengan Laporan:
 * transaksi kasir yang tidak direfund + pesanan sales berstatus Lunas.
 */
export async function readCashBookSales(
  query: CashBookQuery,
  branchId: string | null,
): Promise<{ transactions: Transaction[]; salesOrders: SalesOrder[] }> {
  const range = resolveCashBookRange(query);
  const admin = createSupabaseAdminClient();

  let transactionRequest = admin
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .is("refunded_at", null)
    .gte("created_at", range.startIso)
    .lte("created_at", range.endIso)
    .order("created_at", { ascending: true });

  if (branchId) transactionRequest = transactionRequest.eq("branch_id", branchId);

  const orderStart = new Date(
    new Date(range.startIso).getTime() - ORDER_LOOKBACK_MS,
  ).toISOString();

  let orderRequest = admin
    .from("sales_orders")
    .select(SALES_ORDER_COLUMNS)
    .eq("status", "Lunas")
    .not("paid_at", "is", null)
    .gte("paid_at", range.startIso)
    .lte("paid_at", range.endIso)
    .gte("created_at", orderStart)
    .order("paid_at", { ascending: true });

  if (branchId) orderRequest = orderRequest.eq("branch_id", branchId);

  const [transactionResult, orderResult] = await Promise.all([
    transactionRequest,
    orderRequest,
  ]);

  if (transactionResult.error) throw new Error(transactionResult.error.message);
  if (orderResult.error) throw new Error(orderResult.error.message);

  return {
    transactions: ((transactionResult.data ?? []) as TransactionRow[]).map(
      mapTransactionRow,
    ),
    salesOrders: ((orderResult.data ?? []) as SalesOrderRow[]).map(
      mapSalesOrderRow,
    ),
  };
}

/** Saldo kas sebelum periode: entri manual + penjualan (dihitung di SQL). */
export async function readCashBookOpeningBalance(
  query: CashBookQuery,
  branchId: string | null,
): Promise<number> {
  const range = resolveCashBookRange(query);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("fn_cash_book_opening_balance", {
    p_start_date: range.startDate,
    p_start_at: range.startIso,
    p_branch_id: branchId,
  });

  if (error) throw new Error(error.message);

  return Number(data ?? 0);
}
