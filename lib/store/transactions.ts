import type { Transaction } from "@/lib/store/types";

/**
 * Transaksi yang sudah direfund tidak lagi dihitung sebagai omzet, laba,
 * bonus sales, maupun produk terjual.
 */
export function isTransactionRefunded(transaction: Transaction): boolean {
  return transaction.refund !== undefined;
}
