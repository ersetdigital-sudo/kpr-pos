import { formatRupiah } from "@/lib/format";
import type { KasirProduct } from "@/features/kasir/types";

interface ProductCardProps {
  product: KasirProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <button
      type="button"
      className="flex cursor-pointer flex-col gap-2 rounded-card border border-line bg-surface p-2.5 text-left font-sans text-ink"
    >
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-control bg-line text-meta text-ink-muted">
        Foto
      </div>
      <div className="text-body font-semibold">{product.name}</div>
      <div className="flex w-full items-center justify-between">
        <span className="text-body font-bold">{formatRupiah(product.price)}</span>
        <span className="text-meta text-ink-muted">Stok {product.stock}</span>
      </div>
    </button>
  );
}
