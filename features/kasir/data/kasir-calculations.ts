import { getNextDailyDocumentNumber } from "@/lib/document-number";
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

export function getLineUnitPrice(line: CartLine): number {
  if (line.priceType === "wholesale" && line.product.wholesalePrice > 0) {
    return line.product.wholesalePrice;
  }

  return line.product.price;
}

export function calculateLineGross(line: CartLine): number {
  return getLineUnitPrice(line) * line.quantity;
}

export function calculateSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + calculateLineGross(line), 0);
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

/** Diskon nominal dihitung per pcs; persen dihitung dari total baris. */
export function calculateItemDiscount(
  gross: number,
  type: DiscountType,
  value: number,
  quantity: number,
): number {
  if (type === "percent") {
    return calculateDiscountAmount(gross, type, value);
  }

  const perPiece = Math.max(0, Math.round(value));
  const pieces = Math.max(0, Math.round(quantity));

  return Math.min(gross, perPiece * pieces);
}

export function calculateLineDiscount(line: CartLine): number {
  return calculateItemDiscount(
    calculateLineGross(line),
    line.discountType,
    line.discountValue,
    line.quantity,
  );
}

export function calculateLineTotal(line: CartLine): number {
  return Math.max(0, calculateLineGross(line) - calculateLineDiscount(line));
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

export function calculateCartTotals(lines: readonly CartLine[]): CartTotals {
  const subtotal = calculateSubtotal(lines);
  const discountAmount = lines.reduce(
    (total, line) => total + calculateLineDiscount(line),
    0,
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
  return getNextDailyDocumentNumber(
    transactions.map((transaction) => transaction.invoiceNumber),
    "INV",
    date,
  );
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
