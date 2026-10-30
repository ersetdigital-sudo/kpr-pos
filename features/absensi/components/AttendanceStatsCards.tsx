import { StatCard } from "@/components/ui/StatCard";
import type { AttendanceStats } from "@/features/absensi/types";

interface AttendanceStatsCardsProps {
  stats: AttendanceStats;
}

export function AttendanceStatsCards({ stats }: AttendanceStatsCardsProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
      <StatCard
        label="Hadir"
        value={stats.present}
        hint="Tepat waktu"
        valueTone="success"
        size="sm"
      />
      <StatCard
        label="Telat"
        value={stats.late}
        hint="Lewat jam masuk"
        valueTone="brand"
        size="sm"
      />
      <StatCard
        label="Izin / Sakit"
        value={stats.leave + stats.sick}
        hint={`${stats.leave} izin · ${stats.sick} sakit`}
        size="sm"
      />
      <StatCard
        label="Belum Absen / Alpa"
        value={stats.notCheckedIn + stats.absent}
        hint={`${stats.notCheckedIn} belum absen · ${stats.absent} alpa`}
        valueTone={stats.absent > 0 ? "danger" : "default"}
        size="sm"
      />
    </div>
  );
}
