"use client";

import { ROLES } from "@/constants/roles";
import { appendActivity, createId } from "@/lib/store/activity";
import { updateDatabase, useHydratedDatabase } from "@/lib/store/store";
import type {
  AppDatabase,
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
} from "@/lib/store/types";
import { formatRupiah } from "@/lib/format";
import { selectSession } from "@/features/session/data/session-repository";
import {
  applyOrderStock,
  getNextOrderNumber,
  getOrderQuantity,
  getStockShortage,
  restoreOrderStock,
} from "@/features/pesanan/data/pesanan-calculations";
import type { CreateOrderInput } from "@/features/pesanan/types";

export function usePesananData(): AppDatabase | null {
  return useHydratedDatabase();
}

export function createSalesOrder(input: CreateOrderInput): SalesOrder {
  let created: SalesOrder | undefined;

  updateDatabase((database) => {
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

    const items: SalesOrderItem[] = [...merged.entries()].map(
      ([productId, quantity]) => {
        const product = database.products.find(
          (candidate) => candidate.id === productId && candidate.isActive,
        );
        if (!product) throw new Error("Ada produk yang tidak tersedia");

        return {
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity,
        };
      },
    );

    const total = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const order: SalesOrder = {
      id: createId("so"),
      orderNumber: getNextOrderNumber(database.salesOrders, new Date()),
      customerName,
      customerPhone: input.customerPhone.trim(),
      branchId: input.branchId,
      salesEmployeeId: salesEmployee.id,
      items,
      total,
      status: "Menunggu bayar",
      stockApplied: false,
      note: input.note.trim(),
      createdAt: new Date().toISOString(),
    };

    created = order;

    return appendActivity(
      {
        ...database,
        salesOrders: [order, ...database.salesOrders],
      },
      {
        action: "Membuat",
        detail: `Pesanan ${order.orderNumber} · ${customerName} · ${formatRupiah(total)}`,
      },
    );
  });

  if (!created) throw new Error("Pesanan gagal disimpan");
  return created;
}

export function updateSalesOrderStatus(
  orderId: string,
  nextStatus: SalesOrderStatus,
): void {
  updateDatabase((database) => {
    const order = database.salesOrders.find((item) => item.id === orderId);
    if (!order) throw new Error("Pesanan tidak ditemukan");
    if (order.status === nextStatus) return database;

    let stocks = database.stocks;
    let stockApplied = order.stockApplied;

    if (nextStatus === "Lunas") {
      const shortage = getStockShortage(database, order);
      if (shortage) throw new Error(shortage);

      if (!order.stockApplied) {
        stocks = applyOrderStock(stocks, order);
        stockApplied = true;
      }
    } else if (order.stockApplied) {
      stocks = restoreOrderStock(stocks, order);
      stockApplied = false;
    }

    const totalQuantity = getOrderQuantity(order);

    return appendActivity(
      {
        ...database,
        stocks,
        salesOrders: database.salesOrders.map((item) =>
          item.id === orderId
            ? { ...item, status: nextStatus, stockApplied }
            : item,
        ),
      },
      {
        action: nextStatus === "Dibatalkan" ? "Membatalkan" : "Mengubah",
        detail: `Pesanan ${order.orderNumber} · ${order.status} → ${nextStatus}${nextStatus === "Lunas" ? ` · stok -${totalQuantity} pcs` : ""}`,
      },
    );
  });
}
