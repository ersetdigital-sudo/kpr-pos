"use client";

import { formatNumber } from "@/lib/format";
import { recordActivity } from "@/lib/store/activity";
import { getDatabase, useHydratedDatabase } from "@/lib/store/store";
import type { AppDatabase, Customer } from "@/lib/store/types";
import {
  deleteCustomerAction,
  mergeCustomersAction,
  saveCustomerAction,
  setCustomerActiveAction,
} from "@/features/pelanggan/cloud-actions";
import { syncAppFromCloud, trackCloudWrite } from "@/features/sync/data/app-sync";
import type {
  CustomerActionResult,
  CustomerActiveResult,
  CustomerDeleteResult,
  CustomerInput,
  CustomerMergeResult,
  CustomerRow,
} from "@/features/pelanggan/types";

export function usePelangganData(): AppDatabase | null {
  return useHydratedDatabase();
}

export async function saveCustomer(
  input: CustomerInput,
): Promise<Customer> {
  const result: CustomerActionResult = await trackCloudWrite(() =>
    saveCustomerAction(input),
  );

  if (!result.ok) throw new Error(result.error);

  await syncAppFromCloud({ force: true }).catch(() => undefined);

  recordActivity({
    action: input.id ? "Mengubah" : "Membuat",
    detail: `Pelanggan ${result.data.name}${result.data.allowTempo ? " · boleh tempo" : ""}`,
  });

  return result.data;
}

/** Pelanggan dari cache yang boleh dipakai untuk tempo. */
export function getTempoCustomers(database: AppDatabase): Customer[] {
  return database.customers
    .filter((customer) => customer.isActive && customer.allowTempo)
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function hasActiveTempo(orderCustomerId: string): boolean {
  return getDatabase().salesOrders.some(
    (order) =>
      order.customerId === orderCustomerId &&
      order.paymentScheme === "tempo" &&
      order.status === "Tempo - menunggu pembayaran",
  );
}

export async function deleteCustomerRecord(
  row: CustomerRow,
): Promise<CustomerDeleteResult> {
  const result = await trackCloudWrite(() =>
    deleteCustomerAction(row.id),
  );

  if (!result.ok) throw new Error(result.error);

  await syncAppFromCloud({ force: true }).catch(() => undefined);

  recordActivity({
    action: "Menghapus",
    detail: `Pelanggan ${result.data.name || row.name} dihapus`,
  });

  return result.data;
}

export async function mergeCustomers(
  source: CustomerRow,
  target: CustomerRow,
): Promise<CustomerMergeResult> {
  const result = await trackCloudWrite(() =>
    mergeCustomersAction(source.id, target.id),
  );

  if (!result.ok) throw new Error(result.error);

  await syncAppFromCloud({ force: true }).catch(() => undefined);

  const tempoNote =
    result.data.movedActiveTempo > 0
      ? ` · ${formatNumber(result.data.movedActiveTempo)} tempo aktif`
      : "";
  recordActivity({
    action: "Menggabungkan",
    detail: `Pelanggan ${result.data.sourceName || source.name} digabung ke ${result.data.targetName || target.name} · ${formatNumber(result.data.movedOrders)} pesanan dipindah${tempoNote}`,
  });

  return result.data;
}

export async function setCustomerActive(
  row: CustomerRow,
  isActive: boolean,
): Promise<CustomerActiveResult> {
  const result = await trackCloudWrite(() =>
    setCustomerActiveAction(row.id, isActive),
  );

  if (!result.ok) throw new Error(result.error);

  await syncAppFromCloud({ force: true }).catch(() => undefined);

  recordActivity({
    action: "Mengubah",
    detail: `Pelanggan ${result.data.name || row.name} ${isActive ? "diaktifkan" : "dinonaktifkan"}`,
  });

  return result.data;
}

export function logCustomerRecapExport(
  periodLabel: string,
  count: number,
): void {
  recordActivity({
    action: "Membuka",
    detail: `Export Excel rekap belanja pelanggan ${periodLabel} · ${formatNumber(count)} pelanggan`,
  });
}
