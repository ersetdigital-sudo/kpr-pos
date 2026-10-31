import { Card } from "@/components/ui/Card";
import { formatNumber, formatRupiahCompact } from "@/lib/format";
import type { SalesSourceSummary } from "@/lib/store/sales";

interface SalesSourceCardProps {
  breakdown: readonly SalesSourceSummary[];
}

export function SalesSourceCard({ breakdown }: SalesSourceCardProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="m-0 text-card-title font-bold text-ink">
            Kasir vs Pesanan Sales
          </h2>
          <p className="mt-0.5 mb-0 text-meta text-ink-muted">
            Omzet per sumber. Metode bayar &amp; per kasir hanya dari transaksi
            kasir.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {breakdown.map((item) => (
            <div key={item.source} className="min-w-[140px]">
              <div className="text-meta text-ink-muted">{item.source}</div>
              <div className="text-body font-semibold text-ink">
                {formatRupiahCompact(item.amount)} ·{" "}
                {formatNumber(item.count)} trx
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
