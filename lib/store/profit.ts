/** Baris item yang menyimpan snapshot harga modal. */
export interface CostSnapshotItem {
  productId: string;
  quantity: number;
  /** Harga modal saat transaksi/pesanan dibuat; data lama bisa belum punya nilai ini. */
  unitCost?: number;
}

/** Dokumen yang punya total setelah diskon dan baris item. */
export interface CostSnapshotDocument {
  total: number;
  items: readonly CostSnapshotItem[];
}

export type ProductCostLookup = ReadonlyMap<string, number>;

export function buildProductCostLookup(
  products: readonly { id: string; costPrice: number }[],
): ProductCostLookup {
  return new Map(products.map((product) => [product.id, product.costPrice]));
}

/**
 * Harga modal baris: pakai snapshot saat transaksi, atau costPrice produk
 * terkini sebagai fallback untuk data lama yang belum punya unitCost.
 */
export function resolveUnitCost(
  item: CostSnapshotItem,
  productCostById: ProductCostLookup,
): number {
  return item.unitCost ?? productCostById.get(item.productId) ?? 0;
}

/** Laba kotor = total setelah diskon - total harga modal. */
export function calculateGrossProfit(
  document: CostSnapshotDocument,
  productCostById: ProductCostLookup,
): number {
  const totalCost = document.items.reduce(
    (sum, item) => sum + resolveUnitCost(item, productCostById) * item.quantity,
    0,
  );

  return document.total - totalCost;
}

/**
 * Melengkapi unitCost yang belum ada dengan costPrice produk saat ini.
 * Dipakai untuk migrasi data lama; item yang sudah punya snapshot tidak diubah.
 */
export function withUnitCostSnapshot<T extends CostSnapshotItem>(
  item: T,
  productCostById: ProductCostLookup,
): T {
  if (typeof item.unitCost === "number") return item;

  const unitCost = productCostById.get(item.productId);
  return unitCost === undefined ? item : { ...item, unitCost };
}
