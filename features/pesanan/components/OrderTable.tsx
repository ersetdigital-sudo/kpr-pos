"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icon";
import { formatDateTimeShort, formatNumber, formatRupiah } from "@/lib/format";
import type { SalesOrderStatus } from "@/lib/store/types";
import { getNextOrderStatuses } from "@/features/pesanan/data/pesanan-calculations";
import { OrderStatusBadge } from "@/features/pesanan/components/OrderStatusBadge";
import { OrderStatusDialog } from "@/features/pesanan/components/OrderStatusDialog";
import type { OrderRow } from "@/features/pesanan/types";

interface OrderTableProps {
  rows: readonly OrderRow[];
  canManage: boolean;
  canDelete: boolean;
  showSales: boolean;
  title: string;
  onStatusChange: (row: OrderRow, status: SalesOrderStatus) => void;
  onDelete: (row: OrderRow) => void;
  onViewDetail: (row: OrderRow) => void;
}

export function OrderTable({
  rows,
  canManage,
  canDelete,
  showSales,
  title,
  onStatusChange,
  onDelete,
  onViewDetail,
}: OrderTableProps) {
  const [statusTarget, setStatusTarget] = useState<OrderRow | null>(null);

  const columns = useMemo(() => {
    const base: DataTableColumn<OrderRow>[] = [
      {
        id: "id",
        header: "No. Pesanan",
        cell: (order) => (
          <div>
            <div className="font-semibold text-ink">{order.orderNumber}</div>
            <div className="text-meta text-ink-muted">
              {formatDateTimeShort(order.createdAt)}
            </div>
          </div>
        ),
      },
      {
        id: "customer",
        header: "Pelanggan",
        cell: (order) => (
          <div className="min-w-0">
            <div className="truncate text-ink">{order.customerName}</div>
            {order.customerPhone ? (
              <div className="text-meta text-ink-muted">
                {order.customerPhone}
              </div>
            ) : null}
          </div>
        ),
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
    ];

    if (showSales) {
      base.splice(2, 0, {
        id: "sales",
        header: "Sales",
        cell: (order) => (
          <div>
            <div className="text-ink">{order.salesName}</div>
            <div className="text-meta text-ink-muted">{order.branchName}</div>
          </div>
        ),
      });
    }

    base.push({
      id: "status",
      header: "Status",
      cell: (order) => <OrderStatusBadge status={order.status} />,
    });

    base.push({
      id: "actions",
      header: "Aksi",
      align: "right",
      cell: (order) => {
        const canChangeStatus =
          canManage && getNextOrderStatuses(order.status).length > 0;

        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <Button
              variant="outline"
              size="sm"
              className="h-[32px] px-2.5 text-meta"
              onClick={() => onViewDetail(order)}
            >
              Detail
            </Button>

            {canChangeStatus ? (
              <Button
                variant="outline"
                size="sm"
                className="h-[32px] px-2.5 text-meta"
                aria-haspopup="dialog"
                aria-label={`Ubah status pesanan ${order.orderNumber}`}
                title={`Ubah status pesanan ${order.orderNumber}`}
                onClick={() => setStatusTarget(order)}
              >
                Ubah status
                <Icon
                  name="chevronDown"
                  size={14}
                  strokeWidth={2}
                  className="text-ink-muted"
                />
              </Button>
            ) : null}

            {canDelete ? (
              <Button
                variant="dangerOutline"
                size="sm"
                className="h-[32px] px-2.5 text-meta"
                disabled={order.status !== "Dibatalkan"}
                title={
                  order.status === "Dibatalkan"
                    ? `Hapus pesanan ${order.orderNumber}`
                    : "Batalkan pesanan dulu untuk menghapus"
                }
                aria-label={`Hapus pesanan ${order.orderNumber}`}
                onClick={() => onDelete(order)}
              >
                <Icon name="trash" size={14} />
                Hapus
              </Button>
            ) : null}
          </div>
        );
      },
    });

    return base;
  }, [canDelete, canManage, onDelete, onViewDetail, showSales]);

  return (
    <Card className="p-5">
      <CardHeader
        title={title}
        subtitle="Status lunas otomatis mengurangi stok cabang. Membatalkan pesanan Lunas ikut me-refund transaksi kasirnya. Pesanan yang sudah dibatalkan bisa dihapus."
        className="mb-3.5"
      />

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            Belum ada pesanan
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            Pesanan yang disimpan akan muncul di sini.
          </p>
        </div>
      ) : (
        <>
          <DataTable
            ariaLabel={title}
            columns={columns}
            rows={rows}
            rowKey={(order) => order.id}
            minWidth={showSales ? 820 : 660}
            density="roomy"
            headerTone="soft"
          />

          {statusTarget ? (
            <OrderStatusDialog
              order={statusTarget}
              onClose={() => setStatusTarget(null)}
              onSelect={(status) => {
                const target = statusTarget;
                setStatusTarget(null);
                onStatusChange(target, status);
              }}
            />
          ) : null}
        </>
      )}
    </Card>
  );
}
