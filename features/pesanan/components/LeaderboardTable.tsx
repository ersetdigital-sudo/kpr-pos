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
    header: "Pesanan",
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
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
    <Card className="p-5">
      <CardHeader
        title="Papan Peringkat Sales · Oktober"
        action={
          <span className="text-meta text-ink-muted">
            Aturan bonus diatur Owner di Pengaturan
          </span>
        }
      />
      <div className="mt-3">
        <DataTable
          ariaLabel="Papan peringkat sales Oktober"
          columns={columns}
          rows={entries}
          rowKey={(entry) => String(entry.rank)}
          minWidth={480}
          rowClassName={(entry) =>
            entry.isCurrentUser ? "bg-brand-soft" : undefined
          }
        />
      </div>
    </Card>
  );
}
