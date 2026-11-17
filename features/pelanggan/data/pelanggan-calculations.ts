import { isWithinRange } from "@/lib/date-range";
import {
  isCountedSalesOrder,
  isUnsettledSalesOrder,
} from "@/lib/store/sales";
import type { DateRange } from "@/lib/date-range";
import type {
  AppDatabase,
  Customer,
  SalesOrder,
} from "@/lib/store/types";
import type {
  CustomerHistoryRow,
  CustomerRecapRow,
  CustomerSpendingData,
} from "@/features/pelanggan/types";

export function normalizeCustomerName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Pesanan yang sudah menjadi belanja pelanggan: aturan uang penjualan
 * (isCountedSalesOrder) + COD/Tempo yang stoknya sudah keluar.
 *
 * Pesanan Lunas yang dibayar lewat Kasir sengaja ikut dihitung sekali di sini:
 * isCountedSalesOrder mengabaikannya karena nominalnya sudah diwakili transaksi
 * kasir, tetapi transaksi kasir tidak menyimpan customer_id sehingga pesanan
 * itulah satu-satunya jejak pelanggannya. Pesanan batal/menunggu tidak masuk.
 */
export function isCustomerPurchase(order: SalesOrder): boolean {
  if (isUnsettledSalesOrder(order)) return true;
  if (isCountedSalesOrder(order)) return true;

  return order.status === "Lunas";
}

/** Tanggal belanja; COD/Tempo memakai tanggal diproses. */
export function getOrderPurchaseDate(order: SalesOrder): string {
  return order.processedAt ?? order.paidAt ?? order.createdAt;
}

/** Nama hanya aman dipakai sebagai kunci bila tidak ada pelanggan aktif kembar. */
function isCustomerNameUnique(
  database: AppDatabase,
  customer: Customer,
): boolean {
  const normalized = normalizeCustomerName(customer.name);

  return (
    database.customers.filter(
      (item) =>
        item.isActive && normalizeCustomerName(item.name) === normalized,
    ).length === 1
  );
}

/**
 * Pesanan lama bisa belum punya customer_id (dibuat hanya dengan nama).
 * Rekap belanja memakai nama hanya bila unik supaya pesanan tidak terhitung
 * dobel saat masih ada pelanggan kembar.
 */
export function getCustomerOrders(
  database: AppDatabase,
  customer: Customer,
): SalesOrder[] {
  const nameMatchAllowed = isCustomerNameUnique(database, customer);

  return database.salesOrders
    .filter((order) => {
      if (order.customerId) return order.customerId === customer.id;
      if (!nameMatchAllowed) return false;

      return (
        normalizeCustomerName(order.customerName) ===
        normalizeCustomerName(customer.name)
      );
    })
    .sort(
      (first, second) =>
        new Date(getOrderPurchaseDate(second)).getTime() -
        new Date(getOrderPurchaseDate(first)).getTime(),
    );
}

/**
 * Penjaga hapus/gabung memakai pencocokan nama yang sama dengan RPC, termasuk
 * saat nama kembar, karena RPC akan memindahkan/menolak riwayat tersebut.
 */
function getCustomerManagementOrders(
  database: AppDatabase,
  customer: Customer,
): SalesOrder[] {
  const normalized = normalizeCustomerName(customer.name);

  return database.salesOrders.filter(
    (order) =>
      order.customerId === customer.id ||
      (order.customerId === null &&
        normalizeCustomerName(order.customerName) === normalized),
  );
}

function toHistoryRow(order: SalesOrder): CustomerHistoryRow {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    at: getOrderPurchaseDate(order),
    method:
      order.paymentScheme === "cod"
        ? "COD"
        : order.paymentScheme === "tempo"
          ? "Tempo"
          : "Tunai",
    total: order.total,
    status: order.status,
    paymentScheme: order.paymentScheme ?? "cash",
  };
}

/** Rekap belanja + riwayat pesanan pada periode aktif. */
export function buildCustomerSpending(
  database: AppDatabase,
  customer: Customer,
  range: DateRange,
): CustomerSpendingData {
  const orders = getCustomerOrders(database, customer).filter((order) =>
    isWithinRange(getOrderPurchaseDate(order), range),
  );
  const purchases = orders.filter(isCustomerPurchase);
  const lastPurchaseAt = purchases.reduce<string | null>(
    (latest, order) => {
      const at = getOrderPurchaseDate(order);
      if (!latest) return at;

      return new Date(at).getTime() > new Date(latest).getTime()
        ? at
        : latest;
    },
    null,
  );

  return {
    summary: {
      transactionCount: purchases.length,
      totalSpending: purchases.reduce(
        (total, order) => total + order.total,
        0,
      ),
      lastPurchaseAt,
    },
    history: orders.map(toHistoryRow),
  };
}

/** Baris halaman Pelanggan: belanja periode aktif + penjaga hapus. */
export function buildCustomerRecapRows(
  database: AppDatabase,
  range: DateRange,
): CustomerRecapRow[] {
  return database.customers
    .filter((customer) => customer.isActive)
    .map((customer) => {
      const managementOrders = getCustomerManagementOrders(
        database,
        customer,
      );
      const { summary } = buildCustomerSpending(database, customer, range);
      const credits = managementOrders.filter(isUnsettledSalesOrder);

      return {
        ...customer,
        transactionCount: summary.transactionCount,
        totalSpending: summary.totalSpending,
        lastPurchaseAt: summary.lastPurchaseAt,
        historyCount: managementOrders.length,
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
