import { Card } from "@/components/ui/Card";
import { formatNumber, formatRupiahCompact } from "@/lib/format";
import type { CashierReport } from "@/features/laporan/types";

interface CashierReportCardProps {
  cashiers: readonly CashierReport[];
  cashDifference: number;
}

export function CashierReportCard({
  cashiers,
  cashDifference,
}: CashierReportCardProps) {
  return (
    <Card className="min-w-0 flex-[1_1_300px] p-5">
      <h2 className="mt-0 mb-3 text-card-title font-bold text-ink">
        Per Kasir
      </h2>

      {cashiers.map((cashier) => (
        <div
          key={cashier.name}
          className="flex justify-between border-b border-line-faint py-2.5 text-body"
        >
          <span className="font-semibold text-ink">{cashier.name}</span>
          <span className="text-ink">
            {formatNumber(cashier.transactionCount)} trx ·{" "}
            {formatRupiahCompact(cashier.revenue)}
          </span>
        </div>
      ))}

      <div className="flex justify-between py-2.5 text-body text-ink-muted">
        <span>Selisih kas</span>
        <span className="font-semibold text-success-ink">
          {formatRupiahCompact(cashDifference)}
        </span>
      </div>
    </Card>
  );
}
