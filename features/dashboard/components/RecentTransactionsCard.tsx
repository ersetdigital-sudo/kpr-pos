import { CardHeader } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { DashboardCard } from "@/features/dashboard/components/DashboardCard";
import type { RecentTransaction } from "@/features/dashboard/types";
import type { PaymentMethod } from "@/types";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";

interface PaymentMeta {
  icon: IconName;
  className: string;
}

const PAYMENT_META: Record<PaymentMethod, PaymentMeta> = {
  Cash: {
    icon: "wallet",
    className: "bg-canvas text-ink-soft",
  },
  QRIS: {
    icon: "qr",
    className: "bg-info-soft text-info-ink",
  },
  Transfer: {
    icon: "bank",
    className: "bg-warning-soft text-warning-ink",
  },
};

interface RecentTransactionsCardProps {
  transactions: readonly RecentTransaction[];
}

export function RecentTransactionsCard({
  transactions,
}: RecentTransactionsCardProps) {
  return (
    <DashboardCard className="flex min-w-0 flex-col">
      <CardHeader title="Transaksi Terakhir" />

      {transactions.length === 0 ? (
        <p className="mt-3.5 mb-0 rounded-control border border-dashed border-line-strong bg-canvas px-3 py-6 text-center text-meta text-ink-muted">
          Belum ada transaksi pada filter ini.
        </p>
      ) : (
        <div className="mt-2 flex flex-col">
          {transactions.map((transaction) => {
            const payment = PAYMENT_META[transaction.method];

            return (
              <div
                key={transaction.id}
                className="flex items-center gap-3 border-b border-line-faint py-3 first:pt-1 last:border-b-0 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-control-lg",
                    payment.className,
                  )}
                >
                  <Icon name={payment.icon} size={18} strokeWidth={1.8} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      title={transaction.invoiceNumber}
                      className="truncate text-body font-semibold text-ink"
                    >
                      {transaction.invoiceNumber}
                    </span>
                    <span className="shrink-0 text-body font-bold text-ink">
                      {formatRupiah(transaction.total)}
                    </span>
                  </div>

                  <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-meta text-ink-muted">
                    <span className="whitespace-nowrap">{transaction.time}</span>
                    <span aria-hidden="true">·</span>
                    <span className="max-w-[130px] truncate">
                      {transaction.cashier}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium whitespace-nowrap">
                      {transaction.method}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}
