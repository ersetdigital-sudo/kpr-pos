"use client";

import { useCallback, useEffect, useState } from "react";
import { formatRupiah } from "@/lib/format";
import { recordActivity } from "@/lib/store/activity";
import { getDatabase, useHydratedDatabase } from "@/lib/store/store";
import { trackCloudWrite } from "@/features/sync/data/app-sync";
import {
  deleteCashBookEntryAction,
  fetchCashBookAction,
  saveCashBookCategoryAction,
  saveCashBookEntryAction,
  setCashBookCategoryActiveAction,
} from "@/features/buku-kas/cloud-actions";
import type {
  CashBookActionResult,
  CashBookCategory,
  CashBookCategoryInput,
  CashBookEntry,
  CashBookEntryInput,
  CashBookQuery,
  CashBookSource,
} from "@/features/buku-kas/types";

export interface CashBookDataState {
  /** Null sampai periode pertama selesai dimuat. */
  source: CashBookSource | null;
  /** Parameter yang dipakai oleh `source` (bisa tertinggal saat memuat). */
  sourceQuery: CashBookQuery | null;
  loading: boolean;
  /** Muat ulang periode aktif setelah aksi tulis. */
  reload: () => void;
}

interface LoadedCashBook {
  key: string;
  query: CashBookQuery;
  source: CashBookSource;
}

/**
 * Data Buku Kas; null sampai store ter-hydrate agar tanggal hari ini tidak
 * dibaca saat prerender (Cache Components Next 16).
 */
export function useCashBookData(
  query: CashBookQuery | null,
): CashBookDataState {
  const database = useHydratedDatabase();
  const [loaded, setLoaded] = useState<LoadedCashBook | null>(null);
  const [version, setVersion] = useState(0);

  const period = query?.period ?? "harian";
  const date = query?.date ?? "";
  const month = query?.month ?? "";
  const year = query?.year ?? "";
  const scope = query?.scope ?? "all";
  const enabled = database !== null && query !== null;
  const requestKey = `${period}|${date}|${month}|${year}|${scope}|${version}`;

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    const requestQuery: CashBookQuery = { period, date, month, year, scope };

    void fetchCashBookAction(requestQuery)
      .then((result) => {
        if (active) setLoaded({ key: requestKey, query: requestQuery, source: result });
      })
      .catch((error) => {
        console.error("Gagal memuat buku kas:", error);
      });

    return () => {
      active = false;
    };
  }, [enabled, requestKey, period, date, month, year, scope]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return {
    source: loaded?.source ?? null,
    sourceQuery: loaded?.query ?? null,
    loading: enabled && loaded?.key !== requestKey,
    reload,
  };
}

function assertOk(result: CashBookActionResult): void {
  if (!result.ok) throw new Error(result.error);
}

function branchLabel(branchId: string): string {
  return (
    getDatabase().branches.find((branch) => branch.id === branchId)?.name ??
    "Cabang"
  );
}

function typeLabel(type: CashBookEntry["type"]): string {
  return type === "masuk" ? "pemasukan" : "pengeluaran";
}

export async function saveCashBookEntry(
  input: CashBookEntryInput,
): Promise<void> {
  const result = await trackCloudWrite(() => saveCashBookEntryAction(input));
  assertOk(result);
  recordActivity({
    action: input.id ? "Mengubah" : "Membuat",
    detail: `Buku kas ${typeLabel(input.type)} ${formatRupiah(input.amount)} · ${input.description.trim()} · ${branchLabel(input.branchId)}`,
  });
}

export async function deleteCashBookEntry(
  entry: CashBookEntry,
): Promise<void> {
  const result = await trackCloudWrite(() =>
    deleteCashBookEntryAction(entry.id),
  );
  assertOk(result);
  recordActivity({
    action: "Menghapus",
    detail: `Buku kas ${typeLabel(entry.type)} ${formatRupiah(entry.amount)} · ${entry.description} · ${branchLabel(entry.branchId)}`,
  });
}

export async function saveCashBookCategory(
  input: CashBookCategoryInput,
): Promise<void> {
  const result = await trackCloudWrite(() => saveCashBookCategoryAction(input));
  assertOk(result);
  recordActivity({
    action: input.id ? "Mengubah" : "Membuat",
    detail: `Kategori buku kas ${input.type} · ${input.name.trim()}`,
  });
}

export async function setCashBookCategoryActive(
  category: CashBookCategory,
  isActive: boolean,
): Promise<void> {
  const result = await trackCloudWrite(() =>
    setCashBookCategoryActiveAction(category.id, isActive),
  );
  assertOk(result);
  recordActivity({
    action: "Mengubah",
    detail: `Kategori buku kas ${category.name} ${isActive ? "diaktifkan" : "dinonaktifkan"}`,
  });
}
