import { Card, CardHeader } from "@/components/ui/Card";
import { formatMillionsShort, formatRupiahCompact } from "@/lib/format";
import type { WeeklySale } from "@/features/dashboard/types";

interface WeeklySalesCardProps {
  sales: readonly WeeklySale[];
}

export function WeeklySalesCard({ sales }: WeeklySalesCardProps) {
  const total = sales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <Card className="min-w-0 flex-[2_1_480px] p-5">
      <CardHeader
        title="Penjualan 7 Hari Terakhir"
        action={
          <span className="text-label text-ink-muted">
            Total {formatRupiahCompact(total)}
          </span>
        }
      />

      <div className="mt-5 flex h-[220px] items-end gap-[14px] border-b border-line pb-1">
        {sales.map((sale) => (
          <div
            key={sale.key}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <span
              className={
                sale.isCurrentDay
                  ? "text-overline font-bold text-ink"
                  : "text-overline text-ink-muted"
              }
            >
              {formatMillionsShort(sale.total)}
            </span>
            <div
              className={
                sale.isCurrentDay
                  ? "w-full max-w-11 rounded-t-badge bg-brand"
                  : "w-full max-w-11 rounded-t-badge bg-brand-chart"
              }
              style={{ height: sale.barHeight }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-[14px] text-meta text-ink-muted">
        {sales.map((sale) => (
          <span
            key={sale.key}
            className={
              sale.isCurrentDay
                ? "flex-1 text-center font-bold text-ink"
                : "flex-1 text-center"
            }
          >
            {sale.day}
          </span>
        ))}
      </div>
    </Card>
  );
}
