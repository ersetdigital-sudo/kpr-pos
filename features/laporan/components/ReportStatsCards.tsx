import { StatCard } from "@/components/ui/StatCard";
import {
  formatNumber,
  formatPercent,
  formatRupiah,
  formatRupiahCompact,
} from "@/lib/format";
import type { ReportStats } from "@/features/laporan/types";

interface ReportStatsCardsProps {
  stats: ReportStats;
}

export function ReportStatsCards({ stats }: ReportStatsCardsProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
      <StatCard
        label="Omzet (tanpa PPN)"
        value={formatRupiahCompact(stats.revenue)}
        hint={`${formatNumber(stats.transactionCount)} transaksi`}
      />
      <StatCard
        label="PPN Terkumpul"
        value={formatRupiahCompact(stats.taxCollected)}
        valueTone="brand"
        hint={`${formatNumber(stats.taxTransactionCount)} transaksi ber-PPN`}
      />
      <StatCard
        label="Laba Kotor"
        value={formatRupiahCompact(stats.grossProfit)}
        hint={`Margin ${formatPercent(stats.marginPercent)}`}
      />
      <StatCard
        label="Transaksi"
        value={formatNumber(stats.transactionCount)}
        hint={`Rata-rata ${formatRupiah(stats.averageTransaction)}`}
      />
      <StatCard
        label="Total Bonus Sales"
        value={formatRupiahCompact(stats.totalSalesBonus)}
        hint={`${stats.activeSalespeople} sales aktif`}
      />
    </div>
  );
}
