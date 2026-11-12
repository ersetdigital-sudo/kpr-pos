import { StatCard } from "@/components/ui/StatCard";
import { formatDateShort, formatRupiah } from "@/lib/format";
import type { KasbonStats } from "@/features/kasbon/types";

interface KasbonStatsCardsProps {
  stats: KasbonStats;
}

/** Ringkasan kasbon: digeser menyamping di mobile, tiga kolom di desktop. */
export function KasbonStatsCards({ stats }: KasbonStatsCardsProps) {
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0">
      <div className="min-w-[218px] flex-1 snap-start sm:min-w-0">
        <StatCard
          label="Kasbon aktif"
          value={`${stats.activeCount} kasbon`}
          hint={`Total ${formatRupiah(stats.activeAmount)} berjalan`}
        />
      </div>
      <div className="min-w-[218px] flex-1 snap-start sm:min-w-0">
        <StatCard
          label="Menunggu persetujuan saya"
          value={`${stats.awaitingMyApproval} pengajuan`}
          valueTone={stats.awaitingMyApproval > 0 ? "brand" : "default"}
          hint={
            stats.awaitingMyApproval > 0
              ? "Ada yang bisa kamu proses sekarang"
              : "Tidak ada antrean untukmu"
          }
        />
      </div>
      <div className="min-w-[218px] flex-1 snap-start sm:min-w-0">
        <StatCard
          label="Jatuh tempo terdekat"
          value={
            stats.nearestDueDate ? formatDateShort(stats.nearestDueDate) : "—"
          }
          valueTone={stats.overdueCount > 0 ? "danger" : "default"}
          hint={
            stats.nearestDueDate
              ? `${stats.nearestDueName ?? "Karyawan"}${stats.overdueCount > 0 ? ` · ${stats.overdueCount} lewat jatuh tempo` : ""}`
              : "Belum ada kasbon tempo aktif"
          }
        />
      </div>
    </div>
  );
}
