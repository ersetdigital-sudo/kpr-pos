import type {
  DiscountType,
  StockLevel,
  Transaction,
  TransactionItem,
} from "@/lib/store/types";
import type {
  CartItemInput,
  CartLine,
  CartTotals,
  KasirProduct,
} from "@/features/kasir/types";

export function calculateLineTotal(line: CartLine): number {
  return line.product.price * line.quantity;
}

export function calculateSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + calculateLineTotal(line), 0);
}

export function calculateDiscountAmount(
  subtotal: number,
  type: DiscountType,
  value: number,
): number {
  if (subtotal <= 0) return 0;

  const safeValue = Math.max(0, value);

  if (type === "percent") {
    const percent = Math.min(100, safeValue);
    return Math.min(subtotal, Math.round((subtotal * percent) / 100));
  }

  return Math.min(subtotal, Math.round(safeValue));
}

export function calculateTotal(
  subtotal: number,
  type: DiscountType,
  value: number,
): number {
  return Math.max(0, subtotal - calculateDiscountAmount(subtotal, type, value));
}

export function calculateChange(total: number, received: number): number {
  return Math.max(0, Math.round(received) - total);
}

export function calculateCartTotals(
  lines: readonly CartLine[],
  discountType: DiscountType,
  discountValue: number,
): CartTotals {
  const subtotal = calculateSubtotal(lines);
  const discountAmount = calculateDiscountAmount(
    subtotal,
    discountType,
    discountValue,
  );

  return {
    subtotal,
    discountAmount,
    total: Math.max(0, subtotal - discountAmount),
    itemCount: lines.length,
    totalQuantity: lines.reduce((total, line) => total + line.quantity, 0),
  };
}

export function filterProducts(
  products: readonly KasirProduct[],
  query: string,
  categoryId: string | null,
): KasirProduct[] {
  const keyword = query.trim().toLowerCase();

  return products.filter((product) => {
    const matchCategory = !categoryId || product.categoryId === categoryId;
    const matchKeyword =
      !keyword ||
      product.name.toLowerCase().includes(keyword) ||
      product.sku.toLowerCase().includes(keyword);

    return matchCategory && matchKeyword;
  });
}

export function getNextInvoiceNumber(
  transactions: readonly Transaction[],
  date: Date = new Date(),
): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const prefix = `INV-${day}${month}-`;

  const highestSequence = transactions.reduce((highest, transaction) => {
    if (!transaction.invoiceNumber.startsWith(prefix)) return highest;

    const sequence = Number(transaction.invoiceNumber.slice(prefix.length));
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);

  return `${prefix}${String(highestSequence + 1).padStart(3, "0")}`;
}

/** Mengembalikan stok cabang saat transaksi direfund. */
export function restoreStockLevels(
  stocks: readonly StockLevel[],
  branchId: string,
  items: readonly TransactionItem[],
): StockLevel[] {
  return stocks.map((stock) => {
    if (stock.branchId !== branchId) return stock;

    const item = items.find((entry) => entry.productId === stock.productId);
    if (!item) return stock;

    return { ...stock, quantity: stock.quantity + item.quantity };
  });
}

export function reduceStockLevels(
  stocks: readonly StockLevel[],
  branchId: string,
  items: readonly CartItemInput[],
): StockLevel[] {
  return stocks.map((stock) => {
    if (stock.branchId !== branchId) return stock;

    const item = items.find((entry) => entry.productId === stock.productId);
    if (!item) return stock;

    return {
      ...stock,
      quantity: Math.max(0, stock.quantity - item.quantity),
    };
  });
}
