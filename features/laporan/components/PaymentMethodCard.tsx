import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatPercent, formatRupiahCompact } from "@/lib/format";
import type { PaymentBreakdown } from "@/features/laporan/types";

interface PaymentMethodCardProps {
  breakdown: readonly PaymentBreakdown[];
}

export function PaymentMethodCard({ breakdown }: PaymentMethodCardProps) {
  return (
    <Card className="min-w-0 flex-[1_1_300px] p-5">
      <h2 className="mt-0 mb-4 text-card-title font-bold text-ink">
        Per Metode Pembayaran
      </h2>

      <div className="flex flex-col gap-3.5">
        {breakdown.map((item) => (
          <div key={item.method}>
            <div className="flex justify-between text-body">
              <span className="font-semibold text-ink">{item.method}</span>
              <span className="text-ink">
                {formatRupiahCompact(item.amount)} ·{" "}
                {formatPercent(item.percent)}
              </span>
            </div>
            <ProgressBar value={item.percent} size="md" className="mt-1.5" />
          </div>
        ))}
      </div>
    </Card>
  );
}
