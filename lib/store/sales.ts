import { isWithinRange } from "@/lib/date-range";
import { isTransactionRefunded } from "@/lib/store/transactions";
import type { DateRange } from "@/lib/date-range";
import type {
  AppDatabase,
  SalesOrder,
  SalesPaymentScheme,
  ShippingMethod,
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
  discountAmount?: number;
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
  /** Tunai, COD, atau Tempo. Transaksi kasir selalu tunai. */
  paymentScheme: SalesPaymentScheme;
  /** Tanggal jatuh tempo tempo (YYYY-MM-DD); kosong untuk lainnya. */
  dueDate: string | null;
  /** Uang sudah diterima (Lunas). COD/Tempo yang belum lunas bernilai false. */
  settled: boolean;
  settledAt: string | null;
  /**
   * Waktu uang benar-benar masuk untuk Buku Kas. Null bila belum lunas.
   * Untuk COD/Tempo ini tanggal pelunasan, bukan tanggal diproses.
   */
  cashAt: string | null;
  /** Waktu stok keluar / pesanan diproses. */
  processedAt: string;
  subtotal: number;
  discount: number;
  /** Total bayar final termasuk PPN dan ongkir. */
  total: number;
  /** Dasar PPN: barang setelah diskon, tanpa ongkir. */
  goodsTotal: number;
  taxEnabled: boolean;
  taxRate: number;
  /** PPN yang dipungut; 0 untuk data lama dan transaksi tanpa PPN. */
  taxAmount: number;
  shippingMethod: ShippingMethod;
  shippingCost: number;
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
    discountAmount: item.discountAmount,
  }));
}

/** Dasar barang pesanan: harga × qty dikurangi diskon item. */
function calculateGoodsTotal(items: readonly SalesItem[]): number {
  return items.reduce(
    (total, item) =>
      total +
      Math.max(
        0,
        item.unitPrice * item.quantity - (item.discountAmount ?? 0),
      ),
    0,
  );
}

/**
 * Satu-satunya aturan uang penjualan pesanan sudah masuk: Lunas dan belum
 * dibayar lewat Kasir (`transactionId` kosong). Dipakai Buku Kas & bonus sales.
 * Pesanan yang dibayar lewat Kasir dihitung dari transaksinya.
 */
export function isCountedSalesOrder(order: SalesOrder): boolean {
  return order.status === "Lunas" && !order.transactionId;
}

/** COD/Tempo sudah diproses (stok keluar) tetapi uangnya belum diterima. */
export function isUnsettledSalesOrder(order: SalesOrder): boolean {
  return (
    order.status === "COD - menunggu pembayaran" ||
    order.status === "Tempo - menunggu pembayaran"
  );
}

/**
 * Pesanan yang sudah menjadi penjualan toko (stok keluar), termasuk COD/Tempo
 * yang belum lunas. Dipakai Laporan & Dashboard agar penjualan tercatat sejak
 * diproses, sementara Buku Kas tetap hanya menghitung uang yang sudah masuk.
 */
export function isProcessedSalesOrder(order: SalesOrder): boolean {
  return isCountedSalesOrder(order) || isUnsettledSalesOrder(order);
}

/** Tempo yang melewati tanggal jatuh tempo dan belum lunas. */
export function isOverdueTempoSalesOrder(
  order: SalesOrder,
  now: Date = new Date(),
): boolean {
  if (order.status !== "Tempo - menunggu pembayaran" || !order.dueDate) {
    return false;
  }

  return order.dueDate < jakartaDateKey(now);
}

/** Tanggal hari ini menurut zona waktu Jakarta (YYYY-MM-DD). */
function jakartaDateKey(value: Date): string {
  const offsetMs = 7 * 60 * 60 * 1000;
  return new Date(value.getTime() + offsetMs).toISOString().slice(0, 10);
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
 *
 * Pesanan Lunas yang sudah punya `transactionId` (dibayar lewat Kasir) tidak
 * dihitung lagi: nominalnya sudah terwakili transaksi kasir tersebut. Transaksi
 * yang direfund tetap tidak dihitung, jadi pesanan yang transaksinya direfund
 * juga tidak muncul dua kali di mana pun.
 *
 * `includeUnsettled` menambahkan COD/Tempo yang sudah diproses tetapi belum
 * lunas (dipakai Laporan/Dashboard). Buku Kas memakai default false supaya
 * pemasukan hanya muncul saat pelunasan.
 */
export interface CollectSalesOptions {
  includeUnsettled?: boolean;
}

export function collectSalesFrom(
  source: SalesSourceData,
  options: CollectSalesOptions = {},
): SalesRecord[] {
  const includeUnsettled = options.includeUnsettled === true;
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
      paymentScheme: "cash" as const,
      dueDate: null,
      settled: true,
      settledAt: transaction.createdAt,
      cashAt: transaction.createdAt,
      processedAt: transaction.createdAt,
      subtotal: transaction.subtotal,
      discount: transaction.discount.amount,
      total: transaction.total,
      goodsTotal: Math.max(0, transaction.subtotal - transaction.discount.amount),
      taxEnabled: transaction.taxEnabled,
      taxRate: transaction.taxRate,
      taxAmount: transaction.taxAmount,
      shippingMethod: transaction.shippingMethod,
      shippingCost: transaction.shippingCost,
      items: mapItems(transaction.items),
    }));

  const salesOrders: SalesRecord[] = source.salesOrders
    .filter(
      (order) =>
        isCountedSalesOrder(order) ||
        (includeUnsettled && isUnsettledSalesOrder(order)),
    )
    .map((order) => {
      const items = mapItems(order.items);
      const settled = isCountedSalesOrder(order);
      const processedAt =
        order.processedAt ?? order.paidAt ?? order.createdAt;
      const isCredit = (order.paymentScheme ?? "cash") !== "cash";

      return {
        id: order.id,
        number: order.orderNumber,
        source: "Pesanan Sales" as const,
        // COD/Tempo dikenali sebagai penjualan sejak diproses; uangnya baru
        // dihitung Buku Kas pada tanggal pelunasan.
        at: isCredit ? processedAt : (order.paidAt ?? processedAt),
        createdAt: order.createdAt,
        branchId: order.branchId,
        cashierId: null,
        salesEmployeeId: order.salesEmployeeId,
        method: null,
        paymentScheme: order.paymentScheme ?? "cash",
        dueDate: order.dueDate ?? null,
        settled,
        settledAt: settled ? (order.paidAt ?? null) : null,
        cashAt: settled ? (order.paidAt ?? null) : null,
        processedAt,
        subtotal: calculateGoodsTotal(items),
        discount: 0,
        total: order.total,
        goodsTotal: calculateGoodsTotal(items),
        taxEnabled: order.taxEnabled,
        taxRate: order.taxRate,
        taxAmount: order.taxAmount,
        shippingMethod: order.shippingMethod,
        shippingCost: order.shippingCost,
        items,
      };
    });

  return [...transactions, ...salesOrders].sort(
    (first, second) =>
      new Date(second.at).getTime() - new Date(first.at).getTime(),
  );
}

/** Aturan rekap penjualan untuk database lengkap (Laporan, dashboard, dst). */
export function collectSales(
  database: AppDatabase,
  options: CollectSalesOptions = {},
): SalesRecord[] {
  return collectSalesFrom(database, options);
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

/** Omzet toko: tanpa PPN, tetapi ongkir tetap dihitung sebagai penjualan. */
export function saleRevenue(sale: SalesRecord): number {
  return Math.max(0, sale.total - sale.taxAmount);
}

export function sumSalesAmount(sales: readonly SalesRecord[]): number {
  return sales.reduce((total, sale) => total + saleRevenue(sale), 0);
}

export function sumSalesTax(sales: readonly SalesRecord[]): number {
  return sales.reduce((total, sale) => total + sale.taxAmount, 0);
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
