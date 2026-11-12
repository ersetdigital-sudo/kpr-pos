"use client";

import Link from "next/link";
import { CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DashboardCard } from "@/features/dashboard/components/DashboardCard";
import { canAccessPath } from "@/config/navigation";
import { usePermissions } from "@/features/session/data/session-repository";
import type { LowStockProduct } from "@/features/dashboard/types";
import { formatNumber } from "@/lib/format";

interface LowStockCardProps {
  products: readonly LowStockProduct[];
}

export function LowStockCard({ products }: LowStockCardProps) {
  const permissions = usePermissions();
  const canViewProducts = canAccessPath("/produk", permissions);

  return (
    <DashboardCard className="flex min-w-0 flex-col">
      <CardHeader
        title="Stok Menipis"
        action={
          canViewProducts ? (
            <Link href="/produk" className="text-label font-semibold">
              Kelola stok
            </Link>
          ) : undefined
        }
      />

      {products.length === 0 ? (
        <p className="mt-3 mb-0 rounded-control border border-dashed border-line-strong bg-canvas px-3 py-5 text-center text-meta text-ink-muted">
          Semua stok aman pada filter ini.
        </p>
      ) : null}

      <div className="mt-2 flex flex-col">
        {products.map((product) => {
          const outOfStock = product.remaining === 0;

          return (
            <div
              key={product.id}
              className="flex items-center justify-between gap-3 border-b border-line-faint py-3 first:pt-1 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="truncate text-body font-semibold text-ink">
                  {product.name}
                </div>
                <div className="mt-0.5 text-meta text-ink-muted">
                  {product.branch} · Sisa {formatNumber(product.remaining)}
                </div>
              </div>
              <StatusBadge
                tone={outOfStock ? "danger" : "brand"}
                strong
                className="shrink-0"
              >
                {outOfStock ? "Habis" : "Menipis"}
              </StatusBadge>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
