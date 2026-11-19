import { formatNumber } from "@/lib/format";
import type { PriceType, ProductUnit } from "@/lib/store/types";

export const DEFAULT_BASE_UNIT = "pcs";

export const UNIT_PRESETS = [
  "pcs",
  "kubik",
  "rit",
  "kg",
  "sak",
  "meter",
  "batang",
  "pax",
  "box",
] as const;

export interface ProductWithUnits {
  baseUnit: string;
  units: readonly ProductUnit[];
}

/** Satuan dasar + satuan jual tambahan, siap dipakai UI dan perhitungan. */
export interface SellingUnit {
  /** Kosong untuk satuan dasar. */
  id: string;
  name: string;
  content: number;
  price: number;
  wholesalePrice: number;
  isBase: boolean;
}

const decimalFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 3,
});

export function getBaseUnitName(product: ProductWithUnits): string {
  return product.baseUnit?.trim() || DEFAULT_BASE_UNIT;
}

/**
 * Opsi satuan lengkap, termasuk harga satuan dasar dari Product.price.
 */
export function buildSellingUnits(product: {
  baseUnit: string;
  price: number;
  wholesalePrice?: number;
  units: readonly ProductUnit[];
}): SellingUnit[] {
  return [
    {
      id: "",
      name: getBaseUnitName(product),
      content: 1,
      price: product.price,
      wholesalePrice: product.wholesalePrice ?? 0,
      isBase: true,
    },
    ...product.units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      content: unit.content,
      price: unit.price,
      wholesalePrice: unit.wholesalePrice,
      isBase: false,
    })),
  ];
}

export function findSellingUnit(
  product: {
    baseUnit: string;
    price: number;
    wholesalePrice?: number;
    units: readonly ProductUnit[];
  },
  unitId?: string | null,
): SellingUnit | undefined {
  if (!unitId) return buildSellingUnits(product)[0];

  return buildSellingUnits(product).find((unit) => unit.id === unitId);
}

/** Tekan harga sesuai jenis harga; grosir 0 berarti memakai harga ecer. */
export function resolveUnitPrice(
  unit: SellingUnit,
  priceType: PriceType,
): number {
  if (priceType === "wholesale" && unit.wholesalePrice > 0) {
    return unit.wholesalePrice;
  }

  return unit.price;
}

export function toBaseQuantity(quantity: number, unit: SellingUnit): number {
  return quantity * unit.content;
}

export function getSellableQuantity(
  stockBase: number,
  unit: SellingUnit,
): number {
  if (unit.content <= 0) return 0;
  return Math.max(0, Math.floor(stockBase / unit.content));
}

/** Qty dasar dari item transaksi/pesanan; data lama memakai quantity. */
export function getItemBaseQuantity(item: {
  quantity: number;
  baseQuantity?: number;
}): number {
  return item.baseQuantity ?? item.quantity;
}

export function getItemUnitName(
  item: { unitName?: string },
  product?: { baseUnit: string } | null,
): string {
  return item.unitName || product?.baseUnit || DEFAULT_BASE_UNIT;
}

export function getItemUnitContent(item: {
  unitContent?: number;
}): number {
  return item.unitContent && item.unitContent > 0 ? item.unitContent : 1;
}

export function formatDecimal(value: number): string {
  return decimalFormatter.format(value);
}

/**
 * Tampilan stok gabungan, mis. "12 kubik 30 pcs". Satuan terbesar yang muat
 * dipakai lebih dulu, sisanya satuan dasar.
 */
export function formatMixedStock(
  quantity: number,
  product: ProductWithUnits,
): string {
  const baseUnit = getBaseUnitName(product);
  const sign = quantity < 0 ? "-" : "";
  const absolute = Math.abs(quantity);

  if (absolute === 0 || product.units.length === 0) {
    return `${sign}${formatNumber(absolute)} ${baseUnit}`;
  }

  const unit = [...product.units]
    .sort((first, second) => second.content - first.content)
    .find((candidate) => Math.floor(absolute / candidate.content) >= 1);

  if (!unit) {
    return `${sign}${formatNumber(absolute)} ${baseUnit}`;
  }

  const whole = Math.floor(absolute / unit.content);
  const remainder = absolute - whole * unit.content;

  return remainder > 0
    ? `${sign}${formatNumber(whole)} ${unit.name} ${formatNumber(remainder)} ${baseUnit}`
    : `${sign}${formatNumber(whole)} ${unit.name}`;
}

export function buildCartLineKey(productId: string, unitId: string): string {
  return `${productId}|${unitId}`;
}
