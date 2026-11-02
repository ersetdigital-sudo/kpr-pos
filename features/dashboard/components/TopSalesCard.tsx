"use client";

import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { canAccessPath } from "@/config/navigation";
import { usePermissions } from "@/features/session/data/session-repository";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatRupiah } from "@/lib/format";
import type { TopSalesEntry } from "@/features/dashboard/types";

interface TopSalesCardProps {
  entries: readonly TopSalesEntry[];
}

export function TopSalesCard({ entries }: TopSalesCardProps) {
  const permissions = usePermissions();
  const canViewOrders = canAccessPath("/pesanan", permissions);

  return (
    <Card className="min-w-0 p-5">
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

      <div className="mt-[18px] flex flex-col gap-4">
        {entries.map((entry) => (
          <div key={entry.rank}>
            <div className="flex justify-between text-body">
              <span className="font-semibold text-ink">
                {entry.rank}. {entry.name}
              </span>
              <span className="text-ink-muted">{entry.soldCount} pcs</span>
            </div>
            <ProgressBar value={entry.progress} className="mt-1.5" />
            <div className="mt-1 text-meta text-ink-muted">
              Estimasi bonus {formatRupiah(entry.bonus)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
