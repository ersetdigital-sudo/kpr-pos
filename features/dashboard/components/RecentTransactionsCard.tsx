import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import { formatRupiah } from "@/lib/format";
import type { RecentTransaction } from "@/features/dashboard/types";
import type { PaymentMethod } from "@/types";

const PAYMENT_TONES: Record<PaymentMethod, BadgeTone> = {
  Cash: "neutral",
  QRIS: "info",
  Transfer: "warning",
};

const columns: readonly DataTableColumn<RecentTransaction>[] = [
  {
    id: "invoice",
    header: "No. Struk",
    cell: (transaction) => (
      <span className="font-semibold text-ink">
        {transaction.invoiceNumber}
      </span>
    ),
  },
  {
    id: "time",
    header: "Waktu",
    cell: (transaction) => (
      <span className="text-ink-muted">{transaction.time}</span>
    ),
  },
  {
    id: "cashier",
    header: "Kasir",
    cell: (transaction) => transaction.cashier,
  },
  {
    id: "method",
    header: "Metode",
    cell: (transaction) => (
      <StatusBadge tone={PAYMENT_TONES[transaction.method]}>
        {transaction.method}
      </StatusBadge>
    ),
  },
  {
    id: "total",
    header: "Total",
    align: "right",
    cell: (transaction) => (
      <span className="font-semibold text-ink">
        {formatRupiah(transaction.total)}
      </span>
    ),
  },
];

interface RecentTransactionsCardProps {
  transactions: readonly RecentTransaction[];
}

export function RecentTransactionsCard({
  transactions,
}: RecentTransactionsCardProps) {
  return (
    <Card className="min-w-0 flex-[2_1_480px] p-5">
      <CardHeader title="Transaksi Terakhir" className="mb-3.5" />
      {transactions.length === 0 ? (
        <p className="m-0 rounded-control border border-dashed border-line-strong bg-canvas px-3 py-6 text-center text-meta text-ink-muted">
          Belum ada transaksi pada filter ini.
        </p>
      ) : (
        <DataTable
          ariaLabel="Transaksi terakhir"
          columns={columns}
          rows={transactions}
          rowKey={(transaction) => transaction.id}
          minWidth={560}
        />
      )}
    </Card>
  );
}
