import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import { formatNumber, formatRupiah } from "@/lib/format";
import type {
  SalesOrder,
  SalesOrderStatus,
} from "@/features/pesanan/types";

const STATUS_TONES: Record<SalesOrderStatus, BadgeTone> = {
  "Belum sinkron": "warning",
  "Menunggu bayar": "brand",
  Lunas: "success",
};

const columns: readonly DataTableColumn<SalesOrder>[] = [
  {
    id: "id",
    header: "No. Pesanan",
    cell: (order) => (
      <span className="font-semibold text-ink">{order.id}</span>
    ),
  },
  {
    id: "customer",
    header: "Pelanggan",
    cell: (order) => order.customer,
  },
  {
    id: "quantity",
    header: "Qty",
    cell: (order) => formatNumber(order.quantity),
  },
  {
    id: "total",
    header: "Total",
    cell: (order) => formatRupiah(order.total),
  },
  {
    id: "status",
    header: "Status",
    cell: (order) => (
      <StatusBadge tone={STATUS_TONES[order.status]}>
        {order.status}
      </StatusBadge>
    ),
  },
];

interface OrderTableProps {
  orders: readonly SalesOrder[];
}

export function OrderTable({ orders }: OrderTableProps) {
  return (
    <Card className="p-5">
      <CardHeader title="Pesanan Saya" className="mb-3.5" />
      <DataTable
        ariaLabel="Pesanan saya"
        columns={columns}
        rows={orders}
        rowKey={(order) => order.id}
        minWidth={560}
      />
    </Card>
  );
}
