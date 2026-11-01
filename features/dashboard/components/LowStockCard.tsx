"use client";

import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { canAccessPath } from "@/config/navigation";
import { useSession } from "@/features/session/data/session-repository";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { LowStockProduct } from "@/features/dashboard/types";

interface LowStockCardProps {
  products: readonly LowStockProduct[];
}

export function LowStockCard({ products }: LowStockCardProps) {
  const { employee } = useSession();
  const canViewProducts = canAccessPath("/produk", employee.role);

  return (
    <Card className="min-w-0 p-5">
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

      <div className="mt-3 flex flex-col">
        {products.map((product) => {
          const outOfStock = product.remaining === 0;

          return (
            <div
              key={product.id}
              className="flex items-center justify-between border-b border-line-faint py-2.5 last:border-b-0"
            >
              <div>
                <div className="text-body font-semibold text-ink">
                  {product.name}
                </div>
                <div className="text-meta text-ink-muted">
                  {product.branch}
                </div>
              </div>
              <StatusBadge
                tone={outOfStock ? "danger" : "brand"}
                strong
              >
                {outOfStock ? "Habis" : `Sisa ${product.remaining}`}
              </StatusBadge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
