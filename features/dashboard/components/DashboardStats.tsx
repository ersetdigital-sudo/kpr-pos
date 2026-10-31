import { StatCard } from "@/components/ui/StatCard";
import {
  formatDateShort,
  formatNumber,
  formatRupiah,
} from "@/lib/format";
import type { DashboardStats as DashboardStatsData } from "@/features/dashboard/types";

interface DashboardStatsProps {
  stats: DashboardStatsData;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
      <StatCard
        label="Penjualan Hari Ini"
        value={formatRupiah(stats.salesToday)}
        hint={`${stats.growthPercent >= 0 ? "+" : ""}${stats.growthPercent}% dari kemarin`}
        hintTone={stats.growthPercent >= 0 ? "success" : "muted"}
      />
      <StatCard
        label="Jumlah Transaksi"
        value={formatNumber(stats.transactionCount)}
        hint={`Cash ${stats.paymentCounts.cash} · QRIS ${stats.paymentCounts.qris} · Transfer ${stats.paymentCounts.transfer}${
          stats.salesOrderCount > 0
            ? ` · ${stats.salesOrderCount} pesanan sales`
            : ""
        }`}
      />
      <StatCard
        label="Stok Menipis"
        value={`${stats.lowStockCount} produk`}
        valueTone="brand"
        hint="Perlu restock minggu ini"
      />
      <StatCard
        label="Karyawan Hadir"
        value={`${stats.employeesPresent} / ${stats.employeesTotal}`}
        hint={
          stats.attendanceDate
            ? `${stats.employeesOnLeave} izin · data ${formatDateShort(stats.attendanceDate)}`
            : "Belum ada data absensi"
        }
      />
    </div>
  );
}
