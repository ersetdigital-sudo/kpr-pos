import type { ShippingMethod } from "@/lib/store/types";

/**
 * Satu sumber kebenaran hitung PPN + ongkir di klien. RPC Supabase menghitung
 * ulang nilai yang sama; total dari klien tidak pernah dipercaya mentah-mentah.
 */

export interface SalesChargeInput {
  taxEnabled: boolean;
  /** Tarif persen; disimpan sebagai snapshot di dokumen. */
  taxRate: number;
  shippingMethod: ShippingMethod | "";
  shippingCost: number;
}

export interface SalesChargeTotals {
  /** Dasar PPN: subtotal barang setelah semua diskon, tanpa ongkir. */
  taxBase: number;
  taxAmount: number;
  /** Ongkir efektif: 0 untuk ambil di toko dan gratis ongkir. */
  shippingCost: number;
  /** Total bayar = dasar + PPN + ongkir. */
  total: number;
}

/** PPN harus dipilih sadar; form Kasir & Pesanan selalu mulai tanpa PPN. */
export const DEFAULT_TAX_ENABLED = false;

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  pickup: "Ambil di toko",
  paid: "Ongkir dibayar pelanggan",
  free: "Gratis ongkir",
};

export function normalizeTaxRate(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}

export function calculateTaxAmount(
  taxBase: number,
  taxRate: number,
  taxEnabled: boolean,
): number {
  if (!taxEnabled || taxBase <= 0) return 0;

  return Math.round((taxBase * normalizeTaxRate(taxRate)) / 100);
}

/** Ongkir hanya dihitung saat metodenya "paid"; gratis dan pickup selalu 0. */
export function resolveShippingCost(
  method: ShippingMethod | "",
  cost: number,
): number {
  if (method !== "paid") return 0;

  return Math.max(0, Math.round(Number.isFinite(cost) ? cost : 0));
}

export function calculateSalesCharges(input: {
  subtotal: number;
  discountAmount: number;
  taxEnabled: boolean;
  taxRate: number;
  shippingMethod: ShippingMethod | "";
  shippingCost: number;
}): SalesChargeTotals {
  const taxBase = Math.max(
    0,
    Math.round(input.subtotal - input.discountAmount),
  );
  const taxAmount = calculateTaxAmount(
    taxBase,
    input.taxRate,
    input.taxEnabled,
  );
  const shippingCost = resolveShippingCost(
    input.shippingMethod,
    input.shippingCost,
  );

  return {
    taxBase,
    taxAmount,
    shippingCost,
    total: taxBase + taxAmount + shippingCost,
  };
}

/** Label ongkir untuk struk, invoice, dan ringkasan. */
export function shippingChargeLabel(
  method: ShippingMethod,
  amount: number,
): string {
  if (method === "free") return "Gratis ongkir";

  return amount > 0 ? "Ongkir" : "Ambil di toko";
}
