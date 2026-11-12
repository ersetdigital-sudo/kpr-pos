"use server";

import { getAuthorizedSession, getReadSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import type { CloudActionResult } from "@/lib/cloud/result";
import {
  readCashBookBranches,
  readCashBookCategories,
  readCashBookEntries,
  readCashBookOpeningBalance,
  readCashBookSales,
} from "@/features/buku-kas/data/server-snapshot";
import type {
  CashBookCategoryInput,
  CashBookEntryInput,
  CashBookQuery,
  CashBookSource,
} from "@/features/buku-kas/types";

const NO_ACCESS = "Anda tidak punya akses buku kas.";

function fail(message: string): CloudActionResult {
  return { ok: false, error: message };
}

/**
 * Data Buku Kas diambil per periode (bukan dari snapshot harian) supaya
 * tampilan tahunan tetap ringan.
 */
export async function fetchCashBookAction(
  query: CashBookQuery,
): Promise<CashBookSource> {
  const session = await getReadSession();
  if (!session) throw new Error("Sesi pengguna tidak ditemukan");
  if (!session.permissions.canAccessCashBook) throw new Error(NO_ACCESS);

  // Saldo semua cabang hanya untuk Owner; role lain selalu cabangnya sendiri.
  const branchId = session.isOwner
    ? query.scope === "all"
      ? null
      : query.scope
    : session.branch.id;

  const [categories, entries, branches, openingBalance, sales] =
    await Promise.all([
      readCashBookCategories(),
      readCashBookEntries(query, branchId),
      readCashBookBranches(),
      readCashBookOpeningBalance(query, branchId),
      readCashBookSales(query, branchId),
    ]);

  return {
    openingBalance,
    categories,
    entries,
    branches,
    transactions: sales.transactions,
    salesOrders: sales.salesOrders,
  };
}

export async function saveCashBookEntryAction(
  input: CashBookEntryInput,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canAccessCashBook");
  if (!session) return fail(NO_ACCESS);
  if (!session.isOwner && input.branchId !== session.branch.id) {
    return fail("Cabang tidak sesuai akses Anda.");
  }

  const result = await callServiceRpc("fn_save_cash_book_entry", {
    p_payload: {
      id: input.id ?? "",
      branchId: input.branchId,
      type: input.type,
      categoryId: input.categoryId,
      amount: input.amount,
      description: input.description.trim(),
      entryDate: input.entryDate,
      actorId: session.employee.id,
    },
  });

  return result.ok ? { ok: true } : fail(result.error);
}

export async function deleteCashBookEntryAction(
  entryId: string,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canAccessCashBook");
  if (!session) return fail(NO_ACCESS);

  const result = await callServiceRpc("fn_delete_cash_book_entry", {
    p_id: entryId,
    p_actor_id: session.employee.id,
  });

  return result.ok ? { ok: true } : fail(result.error);
}

export async function saveCashBookCategoryAction(
  input: CashBookCategoryInput,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canAccessCashBook");
  if (!session) return fail(NO_ACCESS);

  const result = await callServiceRpc("fn_save_cash_book_category", {
    p_payload: {
      id: input.id ?? "",
      type: input.type,
      name: input.name.trim(),
      actorId: session.employee.id,
    },
  });

  return result.ok ? { ok: true } : fail(result.error);
}

export async function setCashBookCategoryActiveAction(
  categoryId: string,
  isActive: boolean,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canAccessCashBook");
  if (!session) return fail(NO_ACCESS);

  const result = await callServiceRpc("fn_set_cash_book_category_active", {
    p_id: categoryId,
    p_active: isActive,
    p_actor_id: session.employee.id,
  });

  return result.ok ? { ok: true } : fail(result.error);
}
