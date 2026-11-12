import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateShort, formatRupiah } from "@/lib/format";
import type { ReportStats, ReportReceivableRow } from "@/features/laporan/types";

interface ReceivablesCardProps {
  rows: readonly ReportReceivableRow[];
  stats: ReportStats;
}

/** Ringkasan piutang COD/Tempo; daftar kartu agar tetap nyaman di mobile. */
export function ReceivablesCard({ rows, stats }: ReceivablesCardProps) {
  return (
    <Card className="flex min-w-0 flex-col p-5">
      <CardHeader
        title="Piutang COD & Tempo"
        subtitle="Belum lunas, termasuk pesanan dari periode sebelumnya"
        action={
          <div className="text-right">
            <div className="text-card-title font-extrabold text-ink">
              {formatRupiah(stats.receivableTotal)}
            </div>
            <div className="text-meta text-ink-muted">
              {stats.receivableCount} tagihan
              {stats.overdueReceivableTotal > 0
                ? ` · lewat jatuh tempo ${formatRupiah(stats.overdueReceivableTotal)}`
                : ""}
            </div>
          </div>
        }
        className="mb-3"
      />

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            Tidak ada piutang
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            Semua pesanan COD/Tempo pada cakupan ini sudah lunas.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line-faint rounded-control border border-line">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-body font-semibold text-ink">
                    {row.customerName}
                  </span>
                  <StatusBadge tone={row.scheme === "tempo" ? "warning" : "info"}>
                    {row.scheme === "tempo" ? "Tempo" : "COD"}
                  </StatusBadge>
                  {row.isOverdue ? (
                    <StatusBadge tone="danger" strong>
                      Jatuh tempo
                    </StatusBadge>
                  ) : null}
                </div>
                <p className="m-0 text-meta text-ink-muted">
                  {row.orderNumber} · Sales {row.salesName} · {row.branchName}
                  {row.dueDate
                    ? ` · jatuh tempo ${formatDateShort(row.dueDate)}`
                    : " · bayar saat pengiriman"}
                </p>
              </div>

              <span className="shrink-0 text-body font-bold whitespace-nowrap text-ink sm:text-right">
                {formatRupiah(row.total)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
