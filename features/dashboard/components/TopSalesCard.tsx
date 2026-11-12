"use client";

import Link from "next/link";
import { CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DashboardCard } from "@/features/dashboard/components/DashboardCard";
import { canAccessPath } from "@/config/navigation";
import { usePermissions } from "@/features/session/data/session-repository";
import type { TopSalesEntry } from "@/features/dashboard/types";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";

interface TopSalesCardProps {
  entries: readonly TopSalesEntry[];
}

export function TopSalesCard({ entries }: TopSalesCardProps) {
  const permissions = usePermissions();
  const canViewOrders = canAccessPath("/pesanan", permissions);

  return (
    <DashboardCard className="flex min-w-0 flex-col">
      <CardHeader
        title="Top Sales Bulan Ini"
        action={
          canViewOrders ? (
            <Link href="/pesanan" className="text-label font-semibold">
              Lihat semua
            </Link>
          ) : undefined
        }
      />

      {entries.length === 0 ? (
        <p className="mt-4 mb-0 rounded-control border border-dashed border-line-strong bg-canvas px-3 py-5 text-center text-meta text-ink-muted">
          Belum ada penjualan sales bulan ini.
        </p>
      ) : null}

      <div className="mt-3 flex flex-col">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className="flex gap-3 border-b border-line-faint py-3 first:pt-1 last:border-b-0 last:pb-0"
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-meta font-bold",
                entry.rank === 1
                  ? "bg-brand-tint text-brand-strong"
                  : "bg-canvas text-ink-soft",
              )}
            >
              {entry.rank}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-body font-semibold text-ink">
                  {entry.name}
                </span>
                <span className="shrink-0 text-meta text-ink-muted">
                  {formatNumber(entry.soldCount)} pcs
                </span>
              </div>
              <ProgressBar value={entry.progress} className="mt-2" />
              <p className="mt-1.5 mb-0 text-meta text-ink-muted">
                Estimasi bonus{" "}
                <span className="font-semibold text-ink-soft">
                  {formatRupiah(entry.bonus)}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
