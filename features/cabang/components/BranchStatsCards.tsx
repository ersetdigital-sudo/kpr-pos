import { StatCard } from "@/components/ui/StatCard";
import { formatRupiahCompact } from "@/lib/format";
import type { BranchSummary } from "@/features/cabang/types";

interface BranchStatsCardsProps {
  summary: BranchSummary;
}

export function BranchStatsCards({ summary }: BranchStatsCardsProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
      <StatCard
        label="Cabang Aktif"
        value={summary.activeBranches}
        hint={`dari ${summary.totalBranches} cabang`}
        size="sm"
      />
      <StatCard
        label="Karyawan Aktif"
        value={summary.totalEmployees}
        hint="Seluruh cabang"
        size="sm"
      />
      <StatCard
        label="Omzet Bulan Ini"
        value={formatRupiahCompact(summary.monthlyRevenue)}
        hint="Semua cabang"
        valueTone="brand"
        size="sm"
      />
    </div>
  );
}
