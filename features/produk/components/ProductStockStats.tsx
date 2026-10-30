import { StatCard } from "@/components/ui/StatCard";
import { formatNumber, formatRupiahCompact } from "@/lib/format";
import type { ProductStats } from "@/features/produk/types";

interface ProductStockStatsProps {
  stats: ProductStats;
}

export function ProductStockStats({ stats }: ProductStockStatsProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
      <StatCard
        label="Total Nilai Stok"
        value={formatRupiahCompact(stats.totalStockValue)}
        size="sm"
        labelWeight="normal"
      />
      <StatCard
        label="Stok Menipis"
        value={`${stats.lowStockCount} produk`}
        valueTone="brand"
        size="sm"
        labelWeight="normal"
      />
      <StatCard
        label="Stok Habis"
        value={`${stats.outOfStockCount} produk`}
        valueTone="danger"
        size="sm"
        labelWeight="normal"
      />
      <StatCard
        label="Stok Masuk Minggu Ini"
        value={`${formatNumber(stats.incomingThisWeek)} pcs`}
        size="sm"
        labelWeight="normal"
      />
    </div>
  );
}
