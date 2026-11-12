import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { LeaderboardEntry } from "@/features/pesanan/types";

interface LeaderboardTableProps {
  entries: readonly LeaderboardEntry[];
  periodLabel: string;
  bonusRuleLabel: string;
}

/** Papan peringkat kompak; tetap terbaca di kolom samping maupun di mobile. */
export function LeaderboardTable({
  entries,
  periodLabel,
  bonusRuleLabel,
}: LeaderboardTableProps) {
  return (
    <Card className="flex min-w-0 flex-col p-5">
      <CardHeader
        title={`Papan Peringkat Sales · ${periodLabel}`}
        action={
          <span className="text-meta text-ink-muted">
            Aturan: {bonusRuleLabel}
          </span>
        }
      />

      {entries.length === 0 ? (
        <div className="mt-3 rounded-control border border-dashed border-line-strong bg-canvas px-4 py-6 text-center text-body text-ink-muted">
          Belum ada data bonus bulan ini.
        </div>
      ) : (
        <div className="mt-3 flex-1 overflow-y-auto" style={{ maxHeight: 420 }}>
          <ol
            aria-label={`Papan peringkat sales ${periodLabel}`}
            className="flex flex-col gap-1"
          >
            {entries.map((entry) => (
              <li
                key={entry.salesEmployeeId}
                className={cn(
                  "flex items-center gap-2.5 rounded-control px-2.5 py-2",
                  entry.isCurrentUser && "bg-brand-soft",
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-line-subtle text-meta font-bold text-ink-muted">
                  {entry.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-label font-semibold text-ink">
                    {entry.salesName}
                    {entry.isCurrentUser ? " (kamu)" : ""}
                  </div>
                  <div className="truncate text-meta text-ink-muted">
                    {formatNumber(entry.orderCount)} transaksi ·{" "}
                    {formatNumber(entry.soldCount)} pcs
                  </div>
                </div>
                <span className="shrink-0 text-label font-bold text-ink">
                  {formatRupiah(entry.bonus)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}
