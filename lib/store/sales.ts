import { isWithinRange } from "@/lib/date-range";
import { isTransactionRefunded } from "@/lib/store/transactions";
import type { DateRange } from "@/lib/date-range";
import type {
  AppDatabase,
  SalesOrder,
  Transaction,
} from "@/lib/store/types";
import type { PaymentMethod } from "@/types";

export type SalesSource = "Kasir" | "Pesanan Sales";

interface SalesItem {
  productId: string;
  productName: string;
  unitPrice: number;
  unitCost?: number;
  quantity: number;
}

/**
 * Satu baris penjualan dari sumber mana pun. Untuk pesanan sales, `at` adalah
 * tanggal lunas (paidAt), sedangkan `createdAt` tetap tanggal pesanan dibuat.
 */
export interface SalesRecord {
  id: string;
  number: string;
  source: SalesSource;
  at: string;
  createdAt: string;
  branchId: string;
  cashierId: string | null;
  salesEmployeeId: string | null;
  method: PaymentMethod | null;
  subtotal: number;
  discount: number;
  total: number;
  items: readonly SalesItem[];
}

export interface SalesSourceSummary {
  source: SalesSource;
  count: number;
  amount: number;
}

const SALES_SOURCES: readonly SalesSource[] = ["Kasir", "Pesanan Sales"];

function mapItems(items: readonly SalesItem[]): SalesItem[] {
  return items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    unitPrice: item.unitPrice,
    unitCost: item.unitCost,
    quantity: item.quantity,
  }));
}

/** Sumber penjualan minimal yang dibutuhkan aturan rekap penjualan. */
export interface SalesSourceData {
  transactions: readonly Transaction[];
  salesOrders: readonly SalesOrder[];
}

/**
 * Menggabungkan transaksi kasir yang tidak direfund dengan pesanan sales Lunas.
 * Transaksi kasir tetap satu baris walau punya salesEmployeeId, jadi tidak ada
 * perhitungan ganda.
 */
export function collectSalesFrom(source: SalesSourceData): SalesRecord[] {
  const transactions: SalesRecord[] = source.transactions
    .filter((transaction) => !isTransactionRefunded(transaction))
    .map((transaction) => ({
      id: transaction.id,
      number: transaction.invoiceNumber,
      source: "Kasir",
      at: transaction.createdAt,
      createdAt: transaction.createdAt,
      branchId: transaction.branchId,
      cashierId: transaction.cashierId,
      salesEmployeeId: transaction.salesEmployeeId,
      method: transaction.payment.method,
      subtotal: transaction.subtotal,
      discount: transaction.discount.amount,
      total: transaction.total,
      items: mapItems(transaction.items),
    }));

  const salesOrders: SalesRecord[] = source.salesOrders
    .filter((order) => order.status === "Lunas")
    .map((order) => ({
      id: order.id,
      number: order.orderNumber,
      source: "Pesanan Sales",
      at: order.paidAt ?? order.createdAt,
      createdAt: order.createdAt,
      branchId: order.branchId,
      cashierId: null,
      salesEmployeeId: order.salesEmployeeId,
      method: null,
      subtotal: order.total,
      discount: 0,
      total: order.total,
      items: mapItems(order.items),
    }));

  return [...transactions, ...salesOrders].sort(
    (first, second) =>
      new Date(second.at).getTime() - new Date(first.at).getTime(),
  );
}

/** Aturan rekap penjualan untuk database lengkap (Laporan, dashboard, dst). */
export function collectSales(database: AppDatabase): SalesRecord[] {
  return collectSalesFrom(database);
}

export function filterSales(
  sales: readonly SalesRecord[],
  range: DateRange,
  branchId?: string,
): SalesRecord[] {
  return sales.filter(
    (sale) =>
      (!branchId || sale.branchId === branchId) &&
      isWithinRange(sale.at, range),
  );
}

export function sumSalesAmount(sales: readonly SalesRecord[]): number {
  return sales.reduce((total, sale) => total + sale.total, 0);
}

export function summarizeSalesBySource(
  sales: readonly SalesRecord[],
): SalesSourceSummary[] {
  return SALES_SOURCES.map((source) => {
    const records = sales.filter((sale) => sale.source === source);

    return {
      source,
      count: records.length,
      amount: sumSalesAmount(records),
    };
  });
}
