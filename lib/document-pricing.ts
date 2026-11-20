import type { DiscountType } from "@/lib/store/types";

export interface DiscountedUnitPricing {
  hasDiscount: boolean;
  /** Diskon item per satuan jual, dibulatkan ke rupiah terdekat. */
  discountPerUnit: number;
  /** Harga satuan jual setelah diskon item. */
  netUnitPrice: number;
}

/**
 * Harga satuan setelah diskon item untuk tampilan dokumen/struk.
 * Nominal baris dan total tetap memakai nilai tersimpan; pembulatan di sini
 * hanya untuk teks harga per satuan saat diskon persen tidak habis dibagi qty.
 */
export function resolveDiscountedUnitPricing(line: {
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  discountType?: DiscountType;
  discountValue?: number;
}): DiscountedUnitPricing {
  if (line.discountAmount <= 0 || line.quantity <= 0) {
    return {
      hasDiscount: false,
      discountPerUnit: 0,
      netUnitPrice: line.unitPrice,
    };
  }

  const discountPerUnit = Math.round(line.discountAmount / line.quantity);

  return {
    hasDiscount: true,
    discountPerUnit,
    netUnitPrice: Math.max(0, line.unitPrice - discountPerUnit),
  };
}
