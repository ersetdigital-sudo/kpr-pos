import { StatCard } from "@/components/ui/StatCard";
import { formatRupiah } from "@/lib/format";
import type { KasbonRecapStats } from "@/features/kasbon/types";

interface KasbonRecapStatsCardsProps {
  stats: KasbonRecapStats;
}

/** Lima kartu ringkasan rekap: jumlah dan nominal tiap status. */
export function KasbonRecapStatsCards({ stats }: KasbonRecapStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <StatCard
        size="sm"
        label="Total diajukan"
        value={formatRupiah(stats.requested.amount)}
        hint={`${stats.requested.count} kasbon`}
      />
      <StatCard
        size="sm"
        label="Total disetujui"
        value={formatRupiah(stats.approved.amount)}
        valueTone="brand"
        hint={`${stats.approved.count} kasbon`}
      />
      <StatCard
        size="sm"
        label="Total lunas"
        value={formatRupiah(stats.settled.amount)}
        valueTone="success"
        hint={`${stats.settled.count} kasbon`}
      />
      <StatCard
        size="sm"
        label="Belum lunas"
        value={formatRupiah(stats.outstanding.amount)}
        hint={`${stats.outstanding.count} kasbon disetujui`}
      />
      <div className="col-span-2 sm:col-span-1">
        <StatCard
          size="sm"
          label="Ditolak"
          value={formatRupiah(stats.rejected.amount)}
          valueTone="danger"
          hint={`${stats.rejected.count} kasbon`}
        />
      </div>
    </div>
  );
}
