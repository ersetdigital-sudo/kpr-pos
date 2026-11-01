import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { LeaderboardEntry } from "@/features/pesanan/types";

const columns: readonly DataTableColumn<LeaderboardEntry>[] = [
  {
    id: "rank",
    header: "#",
    cell: (entry) => (
      <span className="font-bold text-ink">{entry.rank}</span>
    ),
  },
  {
    id: "sales",
    header: "Sales",
    cell: (entry) => (
      <span className="font-semibold text-ink">
        {entry.salesName}
        {entry.isCurrentUser ? " (kamu)" : ""}
      </span>
    ),
  },
  {
    id: "orders",
    header: "Transaksi",
    cell: (entry) => formatNumber(entry.orderCount),
  },
  {
    id: "sold",
    header: "Terjual",
    cell: (entry) => `${formatNumber(entry.soldCount)} pcs`,
  },
  {
    id: "bonus",
    header: "Bonus",
    align: "right",
    cell: (entry) => (
      <span className="font-bold text-ink">{formatRupiah(entry.bonus)}</span>
    ),
  },
];

interface LeaderboardTableProps {
  entries: readonly LeaderboardEntry[];
  periodLabel: string;
  bonusRuleLabel: string;
}

export function LeaderboardTable({
  entries,
  periodLabel,
  bonusRuleLabel,
}: LeaderboardTableProps) {
  return (
    <Card className="flex min-w-0 flex-[1_1_380px] flex-col p-5">
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
          <DataTable
            ariaLabel={`Papan peringkat sales ${periodLabel}`}
            columns={columns}
            rows={entries}
            rowKey={(entry) => entry.salesEmployeeId}
            minWidth="100%"
            rowClassName={(entry) =>
              entry.isCurrentUser ? "bg-brand-soft" : undefined
            }
          />
        </div>
      )}
    </Card>
  );
}
