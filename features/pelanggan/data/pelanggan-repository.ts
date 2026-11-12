"use client";

import { recordActivity } from "@/lib/store/activity";
import { getDatabase, useHydratedDatabase } from "@/lib/store/store";
import type { AppDatabase, Customer } from "@/lib/store/types";
import { isUnsettledSalesOrder } from "@/lib/store/sales";
import { saveCustomerAction } from "@/features/pelanggan/cloud-actions";
import { syncAppFromCloud, trackCloudWrite } from "@/features/sync/data/app-sync";
import type {
  CustomerActionResult,
  CustomerInput,
  CustomerRow,
} from "@/features/pelanggan/types";

export function usePelangganData(): AppDatabase | null {
  return useHydratedDatabase();
}

/** Master pelanggan + info piutang aktif, untuk tabel/daftar pelanggan. */
export function buildCustomerRows(database: AppDatabase): CustomerRow[] {
  return database.customers
    .filter((customer) => customer.isActive)
    .map((customer) => {
      const credits = database.salesOrders.filter(
        (order) =>
          order.customerId === customer.id && isUnsettledSalesOrder(order),
      );

      return {
        ...customer,
        activeCreditCount: credits.length,
        activeTempo: credits.some(
          (order) =>
            order.paymentScheme === "tempo" &&
            order.status === "Tempo - menunggu pembayaran",
        ),
      };
    })
    .sort((first, second) => first.name.localeCompare(second.name));
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
