import { StatCard } from "@/components/ui/StatCard";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { SalesStats } from "@/features/pesanan/types";

interface SalesStatsCardsProps {
  stats: SalesStats;
}

export function SalesStatsCards({ stats }: SalesStatsCardsProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
      <StatCard
        label="Terjual Bulan Ini"
        value={`${formatNumber(stats.soldThisMonth)} pcs`}
        hint={
          stats.rank > 0
            ? `Peringkat ${stats.rank} dari ${stats.totalSalespeople} sales`
            : stats.soldThisMonth > 0
              ? `Total ${stats.totalSalespeople} sales bulan ini`
              : "Belum ada penjualan bulan ini"
        }
      />
      <StatCard
        label="Bonus Berjalan"
        value={formatRupiah(stats.runningBonus)}
        valueTone="success"
        hint={`Aturan: ${stats.bonusRuleLabel}`}
      />
      <StatCard
        label="Menunggu Pembayaran"
        value={`${stats.awaitingPaymentCount} pesanan`}
        valueTone="brand"
        hint="Bonus masuk setelah lunas"
      />
    </div>
  );
}
