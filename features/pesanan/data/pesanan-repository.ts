"use client";

import { ROLES } from "@/constants/roles";
import { ROLE_PERMISSIONS } from "@/config/permissions";
import { appendActivity, createId } from "@/lib/store/activity";
import {
  getDatabase,
  updateDatabase,
  useHydratedDatabase,
} from "@/lib/store/store";
import type {
  AppDatabase,
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
} from "@/lib/store/types";
import { formatRupiah } from "@/lib/format";
import { selectSession } from "@/features/session/data/session-repository";
import {
  deductStockForOrderAction,
  restoreStockForOrderAction,
} from "@/features/produk/cloud-actions";
import { syncProductStockFromCloud } from "@/features/produk/data/produk-cloud";
import {
  applyOrderStock,
  canChangeOrderStatus,
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
          unitCost: product.costPrice,
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

export function deleteSalesOrder(orderId: string): void {
  updateDatabase((database) => {
    const actor = database.employees.find(
      (employee) => employee.id === database.session.currentEmployeeId,
    );

    if (!actor) {
      throw new Error("Sesi pengguna tidak ditemukan");
    }

    if (!ROLE_PERMISSIONS[actor.role].canDeleteSalesOrder) {
      throw new Error("Role Anda tidak boleh menghapus pesanan");
    }

    const order = database.salesOrders.find((item) => item.id === orderId);
    if (!order) throw new Error("Pesanan tidak ditemukan");

    if (order.status !== "Dibatalkan") {
      throw new Error("Batalkan pesanan terlebih dahulu sebelum menghapus");
    }

    return appendActivity(
      {
        ...database,
        salesOrders: database.salesOrders.filter((item) => item.id !== orderId),
      },
      {
        action: "Menghapus",
        detail: `Pesanan ${order.orderNumber} · ${order.customerName} · ${formatRupiah(order.total)}`,
      },
    );
  });
}

export async function updateSalesOrderStatus(
  orderId: string,
  nextStatus: SalesOrderStatus,
): Promise<void> {
  const database = getDatabase();
  const actor = database.employees.find(
    (employee) => employee.id === database.session.currentEmployeeId,
  );

  if (!actor) {
    throw new Error("Sesi pengguna tidak ditemukan");
  }

  if (!ROLE_PERMISSIONS[actor.role].canManageSalesOrders) {
    throw new Error("Role Anda tidak boleh mengubah status pesanan");
  }

  const order = database.salesOrders.find((item) => item.id === orderId);
  if (!order) throw new Error("Pesanan tidak ditemukan");
  if (order.status === nextStatus) return;

  if (!canChangeOrderStatus(order.status, nextStatus)) {
    throw new Error(
      `Status ${order.status} tidak bisa diubah menjadi ${nextStatus}`,
    );
  }

  const stockItems = order.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));
  const shouldDeduct = nextStatus === "Lunas" && !order.stockApplied;
  const shouldRestore = order.stockApplied && nextStatus !== "Lunas";

  if (shouldDeduct) {
    const shortage = getStockShortage(database, order);
    if (shortage) throw new Error(shortage);

    const result = await deductStockForOrderAction(order.branchId, stockItems);
    if (!result.ok) {
      await syncProductStockFromCloud().catch(() => undefined);
      throw new Error(result.error);
    }
  }

  if (shouldRestore) {
    const result = await restoreStockForOrderAction(order.branchId, stockItems);
    if (!result.ok) {
      await syncProductStockFromCloud().catch(() => undefined);
      throw new Error(result.error);
    }
  }

  try {
    updateDatabase((current) => {
      const currentOrder = current.salesOrders.find(
        (item) => item.id === orderId,
      );

      if (!currentOrder || currentOrder.status !== order.status) {
        throw new Error("Status pesanan sudah berubah. Muat ulang data.");
      }

      let stocks = current.stocks;
      let stockApplied = currentOrder.stockApplied;

      if (nextStatus === "Lunas" && !currentOrder.stockApplied) {
        stocks = applyOrderStock(stocks, currentOrder);
        stockApplied = true;
      } else if (currentOrder.stockApplied && nextStatus !== "Lunas") {
        stocks = restoreOrderStock(stocks, currentOrder);
        stockApplied = false;
      }

      const totalQuantity = getOrderQuantity(currentOrder);
      const changedAt = new Date().toISOString();

      return appendActivity(
        {
          ...current,
          stocks,
          salesOrders: current.salesOrders.map((item) =>
            item.id === orderId
              ? {
                  ...item,
                  status: nextStatus,
                  stockApplied,
                  paidAt: nextStatus === "Lunas" ? changedAt : undefined,
                }
              : item,
          ),
        },
        {
          action: nextStatus === "Dibatalkan" ? "Membatalkan" : "Mengubah",
          detail: `Pesanan ${currentOrder.orderNumber} · ${currentOrder.status} → ${nextStatus}${nextStatus === "Lunas" ? ` · stok -${totalQuantity} pcs` : ""}`,
        },
      );
    });
  } catch (error) {
    if (shouldDeduct) {
      await restoreStockForOrderAction(order.branchId, stockItems).catch(
        () => undefined,
      );
    } else if (shouldRestore) {
      await deductStockForOrderAction(order.branchId, stockItems).catch(
        () => undefined,
      );
    }
    throw error;
  }
}
