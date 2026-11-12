import { Icon } from "@/components/ui/Icon";
import { DashboardCard } from "@/features/dashboard/components/DashboardCard";
import { DashboardStatCard } from "@/features/dashboard/components/DashboardStatCard";
import type { DashboardStats as DashboardStatsData } from "@/features/dashboard/types";
import {
  formatDateShort,
  formatNumber,
  formatRupiah,
  formatRupiahCompact,
} from "@/lib/format";
import { cn } from "@/lib/cn";

interface DashboardStatsProps {
  stats: DashboardStatsData;
  weeklyTotal: number;
}

export function DashboardStats({ stats, weeklyTotal }: DashboardStatsProps) {
  const growthPositive = stats.growthPercent >= 0;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <DashboardCard
        tone="dark"
        padding="lg"
        className="relative flex flex-col overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -bottom-20 h-52 w-52 rounded-full bg-brand/15 blur-2xl"
        />

        <div className="relative flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <p className="m-0 text-label font-medium text-white/70">
              Penjualan hari ini
            </p>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-control-lg bg-white/10 text-white/80"
            >
              <Icon name="chart" size={18} strokeWidth={1.8} />
            </span>
          </div>

          <div className="mt-3 text-[clamp(2rem,4vw,2.75rem)] leading-none font-extrabold tracking-tight break-words text-white">
            {formatRupiah(stats.salesToday)}
          </div>

          <div className="mt-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-meta font-bold",
                growthPositive
                  ? "bg-success/15 text-success-soft"
                  : "bg-white/10 text-danger-line",
              )}
            >
              <Icon
                name={growthPositive ? "trendUp" : "trendDown"}
                size={14}
                strokeWidth={2}
              />
              {growthPositive ? "+" : ""}
              {stats.growthPercent}% dari kemarin
            </span>
          </div>

          <div className="mt-6 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
            <div className="min-w-0">
              <p className="m-0 text-meta text-white/60">
                Total 7 hari terakhir
              </p>
              <p className="mt-1 mb-0 text-panel-title font-bold text-white">
                {formatRupiahCompact(weeklyTotal)}
              </p>
            </div>
            <Icon
              name="trendUp"
              size={22}
              strokeWidth={1.6}
              className="mb-1 shrink-0 text-white/35"
            />
          </div>
        </div>
      </DashboardCard>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <DashboardStatCard
          icon="receipt"
          iconTone="info"
          label="Jumlah transaksi"
          value={formatNumber(stats.transactionCount)}
          hint={
            <>
              <span>Cash {formatNumber(stats.paymentCounts.cash)}</span>
              <span aria-hidden="true"> · </span>
              <span>QRIS {formatNumber(stats.paymentCounts.qris)}</span>
              <span aria-hidden="true"> · </span>
              <span>Transfer {formatNumber(stats.paymentCounts.transfer)}</span>
              {stats.salesOrderCount > 0 ? (
                <span className="mt-0.5 block">
                  termasuk {formatNumber(stats.salesOrderCount)} pesanan sales
                </span>
              ) : null}
            </>
          }
        />

        <DashboardStatCard
          icon="coins"
          iconTone="brand"
          label="PPN terkumpul hari ini"
          value={formatRupiah(stats.taxToday)}
          hint={`${formatNumber(stats.taxTransactionCount)} transaksi ber-PPN`}
        />

        <DashboardStatCard
          icon="package"
          iconTone="danger"
          label="Stok menipis"
          value={`${formatNumber(stats.lowStockCount)} produk`}
          valueTone="danger"
          hint="Perlu restock minggu ini"
        />

        <DashboardStatCard
          icon="users"
          iconTone="success"
          label="Karyawan hadir"
          value={`${formatNumber(stats.employeesPresent)} / ${formatNumber(
            stats.employeesTotal,
          )}`}
          hint={
            stats.attendanceDate
              ? `${formatNumber(stats.employeesOnLeave)} izin · data ${formatDateShort(
                  stats.attendanceDate,
                )}`
              : "Belum ada data absensi"
          }
        />
      </div>
    </div>
  );
}
