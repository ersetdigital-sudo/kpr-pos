"use client";

import { ROLES } from "@/constants/roles";
import { recordActivity } from "@/lib/store/activity";
import { getDatabase, useHydratedDatabase } from "@/lib/store/store";
import type {
  AppDatabase,
  SalesOrder,
  SalesOrderStatus,
} from "@/lib/store/types";
import { formatRupiah } from "@/lib/format";
import { selectSession } from "@/features/session/data/session-repository";
import {
  canChangeOrderStatus,
  getOrderQuantity,
  getStockShortage,
} from "@/features/pesanan/data/pesanan-calculations";
import {
  createSalesOrderAction,
  deleteSalesOrderAction,
  updateSalesOrderStatusAction,
} from "@/features/sales/cloud-actions";
import { syncSalesFromCloud } from "@/features/sales/data/sales-cloud";
import { syncProductStockFromCloud } from "@/features/produk/data/produk-cloud";
import type { CreateOrderInput } from "@/features/pesanan/types";

export function usePesananData(): AppDatabase | null {
  return useHydratedDatabase();
}

async function refreshAfterOrder(includeStock = false): Promise<void> {
  await Promise.allSettled([
    syncSalesFromCloud({ force: true }),
    includeStock
      ? syncProductStockFromCloud({ force: true })
      : Promise.resolve(),
  ]).then((results) => {
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Sinkronisasi setelah pesanan gagal:", result.reason);
      }
    });
  });
}

export async function createSalesOrder(
  input: CreateOrderInput,
): Promise<SalesOrder> {
  const database = getDatabase();
  const { employee } = selectSession(database);
  const customerName = input.customerName.trim();

  if (!customerName) throw new Error("Nama pelanggan wajib diisi");
  if (input.items.length === 0) throw new Error("Tambahkan minimal satu produk");
  if (!database.branches.some((branch) => branch.id === input.branchId)) {
    throw new Error("Cabang pesanan tidak ditemukan");
  }

  // Sales hanya bisa membuat pesanan atas namanya sendiri.
  const salesEmployeeId =
    employee.role === ROLES.SALES ? employee.id : input.salesEmployeeId;
  const salesEmployee = database.employees.find(
    (candidate) =>
      candidate.id === salesEmployeeId &&
      candidate.role === ROLES.SALES &&
      candidate.isActive,
  );

  if (!salesEmployee) throw new Error("Pilih sales yang valid");

  const merged = new Map<string, number>();
  input.items.forEach((item) => {
    if (item.quantity <= 0) return;
    merged.set(
      item.productId,
      (merged.get(item.productId) ?? 0) + Math.round(item.quantity),
    );
  });

  if (merged.size === 0) throw new Error("Jumlah produk harus lebih dari 0");

  merged.forEach((quantity, productId) => {
    const product = database.products.find(
      (candidate) => candidate.id === productId && candidate.isActive,
    );
    if (!product) throw new Error("Ada produk yang tidak tersedia");
    if (quantity <= 0) throw new Error("Jumlah produk harus lebih dari 0");
  });

  const result = await createSalesOrderAction({
    branchId: input.branchId,
    salesEmployeeId: salesEmployee.id,
    customerName,
    customerPhone: input.customerPhone.trim(),
    note: input.note.trim(),
    items: [...merged.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    })),
  });

  if (!result.ok) throw new Error(result.error);

  await refreshAfterOrder();

  recordActivity({
    action: "Membuat",
    detail: `Pesanan ${result.data.orderNumber} · ${customerName} · ${formatRupiah(result.data.total)}`,
  });

  return result.data;
}

export async function deleteSalesOrder(orderId: string): Promise<void> {
  const database = getDatabase();
  const order = database.salesOrders.find((item) => item.id === orderId);
  if (!order) throw new Error("Pesanan tidak ditemukan");

  if (order.status !== "Dibatalkan") {
    throw new Error("Batalkan pesanan terlebih dahulu sebelum menghapus");
  }

  const result = await deleteSalesOrderAction(orderId);
  if (!result.ok) throw new Error(result.error);

  await refreshAfterOrder();

  recordActivity({
    action: "Menghapus",
    detail: `Pesanan ${order.orderNumber} · ${order.customerName} · ${formatRupiah(order.total)}`,
  });
}

export async function updateSalesOrderStatus(
  orderId: string,
  nextStatus: SalesOrderStatus,
): Promise<void> {
  const database = getDatabase();
  const order = database.salesOrders.find((item) => item.id === orderId);
  if (!order) throw new Error("Pesanan tidak ditemukan");
  if (order.status === nextStatus) return;

  if (!canChangeOrderStatus(order.status, nextStatus)) {
    throw new Error(
      `Status ${order.status} tidak bisa diubah menjadi ${nextStatus}`,
    );
  }

  if (nextStatus === "Lunas" && !order.stockApplied) {
    const shortage = getStockShortage(database, order);
    if (shortage) throw new Error(shortage);
  }

  const totalQuantity = getOrderQuantity(order);
  const result = await updateSalesOrderStatusAction(orderId, nextStatus);
  if (!result.ok) throw new Error(result.error);

  await refreshAfterOrder(true);

  recordActivity({
    action: nextStatus === "Dibatalkan" ? "Membatalkan" : "Mengubah",
    detail: `Pesanan ${order.orderNumber} · ${order.status} → ${nextStatus}${nextStatus === "Lunas" ? ` · stok -${totalQuantity} pcs` : ""}`,
  });
}
