import { CardHeader } from "@/components/ui/Card";
import { DashboardCard } from "@/features/dashboard/components/DashboardCard";
import type { WeeklySale } from "@/features/dashboard/types";
import { formatMillionsShort, formatRupiahCompact } from "@/lib/format";
import { cn } from "@/lib/cn";

interface WeeklySalesCardProps {
  sales: readonly WeeklySale[];
  total: number;
}

export function WeeklySalesCard({ sales, total }: WeeklySalesCardProps) {
  return (
    <DashboardCard className="flex min-w-0 flex-col">
      <CardHeader
        title="Penjualan 7 Hari Terakhir"
        action={
          <span className="text-label text-ink-muted">
            Total {formatRupiahCompact(total)}
          </span>
        }
      />

      <div className="mt-6 grid grid-cols-7 items-end gap-1.5 sm:gap-2">
        {sales.map((sale) => {
          const hasValue = sale.total > 0;

          return (
            <div key={sale.key} className="flex min-w-0 flex-col items-center">
              <div className="flex h-[204px] w-full flex-col items-center justify-end">
                <span
                  className={cn(
                    "mb-1 min-h-4 text-[9px] leading-4 whitespace-nowrap sm:text-overline",
                    sale.isCurrentDay
                      ? "font-bold text-ink"
                      : "text-ink-muted",
                    !hasValue && "invisible",
                  )}
                >
                  {formatMillionsShort(sale.total)}
                </span>

                {hasValue ? (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "w-full max-w-9 rounded-t-[7px]",
                      sale.isCurrentDay ? "bg-brand" : "bg-brand-chart",
                    )}
                    style={{ height: sale.barHeight }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-0.5 w-full max-w-9 rounded-full bg-line-strong"
                  />
                )}
              </div>

              <span
                className={cn(
                  "mt-2 w-full text-center text-meta",
                  sale.isCurrentDay
                    ? "font-bold text-ink"
                    : "text-ink-muted",
                )}
              >
                {sale.day}
              </span>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
