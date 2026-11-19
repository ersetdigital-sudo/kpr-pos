import { getNextDailyDocumentNumber } from "@/lib/document-number";
import { resolveUnitPrice } from "@/lib/units";
import type {
  DiscountType,
  Transaction,
} from "@/lib/store/types";
import type {
  CartLine,
  CartTotals,
  KasirProduct,
} from "@/features/kasir/types";

export function getLineUnitPrice(line: CartLine): number {
  return resolveUnitPrice(line.unit, line.priceType);
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

/** Diskon nominal dihitung per satuan jual; persen dari total baris. */
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
