import { StatCard } from "@/components/ui/StatCard";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { SalesStats } from "@/features/pesanan/types";

interface SalesStatsCardsProps {
  stats: SalesStats;
}

/** Ringkasan singkat: digeser menyamping di mobile, tiga kolom di layar lebar. */
export function SalesStatsCards({ stats }: SalesStatsCardsProps) {
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0">
      <div className="min-w-[218px] flex-1 snap-start sm:min-w-0">
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
      </div>
      <div className="min-w-[218px] flex-1 snap-start sm:min-w-0">
        <StatCard
          label="Bonus Berjalan"
          value={formatRupiah(stats.runningBonus)}
          valueTone="success"
          hint={`Aturan: ${stats.bonusRuleLabel}`}
        />
      </div>
      <div className="min-w-[218px] flex-1 snap-start sm:min-w-0">
        <StatCard
          label="Menunggu Pembayaran"
          value={`${stats.awaitingPaymentCount} pesanan`}
          valueTone="brand"
          hint="Bonus masuk setelah lunas"
        />
      </div>
    </div>
  );
}
