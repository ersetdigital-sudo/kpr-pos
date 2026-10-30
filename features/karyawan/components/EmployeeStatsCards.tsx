import { StatCard } from "@/components/ui/StatCard";
import type { EmployeeStats } from "@/features/karyawan/types";

interface EmployeeStatsCardsProps {
  stats: EmployeeStats;
}

export function EmployeeStatsCards({ stats }: EmployeeStatsCardsProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
      <StatCard label="Total Karyawan" value={stats.total} size="sm" />
      <StatCard
        label="Aktif"
        value={stats.active}
        hint="Bisa dipilih di Masuk sebagai"
        valueTone="success"
        size="sm"
      />
      <StatCard
        label="Nonaktif"
        value={stats.inactive}
        hint="Riwayat tetap tersimpan"
        size="sm"
      />
      <StatCard
        label="Role Terpakai"
        value={stats.rolesUsed}
        hint="Dari 8 role tersedia"
        size="sm"
      />
    </div>
  );
}
