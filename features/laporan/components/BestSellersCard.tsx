import { Card } from "@/components/ui/Card";
import { formatNumber } from "@/lib/format";
import type { BestSeller } from "@/features/laporan/types";

interface BestSellersCardProps {
  bestSellers: readonly BestSeller[];
}

export function BestSellersCard({ bestSellers }: BestSellersCardProps) {
  return (
    <Card className="min-w-0 flex-[1_1_300px] p-5">
      <h2 className="mt-0 mb-3 text-card-title font-bold text-ink">
        Produk Terlaris
      </h2>

      {bestSellers.map((product) => (
        <div
          key={product.rank}
          className="flex justify-between border-b border-line-faint py-2.5 text-body last:border-b-0"
        >
          <span>
            <span className="mr-2 text-ink-muted">{product.rank}</span>
            <span className="font-semibold text-ink">{product.name}</span>
          </span>
          <span className="text-ink">
            {formatNumber(product.soldCount)} pcs
          </span>
        </div>
      ))}
    </Card>
  );
}
