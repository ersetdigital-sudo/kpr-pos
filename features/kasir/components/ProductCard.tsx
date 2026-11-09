"use client";

import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import type { KasirProduct } from "@/features/kasir/types";

interface ProductCardProps {
  product: KasirProduct;
  onAdd: (product: KasirProduct) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const outOfStock = product.stock <= 0;

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={outOfStock}
      className={cn(
        "flex cursor-pointer flex-col gap-2 rounded-card border border-line bg-surface p-2.5 text-left font-sans text-ink",
        outOfStock && "cursor-not-allowed opacity-60",
      )}
    >
      <div className="aspect-[4/3] w-full overflow-hidden rounded-control">
        <ImageWithFallback src={product.imageUrl} alt={product.name} />
      </div>
      <div className="text-body font-semibold">{product.name}</div>
      <div className="flex w-full items-center justify-between">
        <span className="text-body font-bold">
          {formatRupiah(product.price)}
        </span>
        <span
          className={cn(
            "text-meta",
            outOfStock
              ? "font-semibold text-danger-ink"
              : "text-ink-muted",
          )}
        >
          {outOfStock ? "Stok habis" : `Stok ${product.stock}`}
        </span>
      </div>
    </button>
  );
}
