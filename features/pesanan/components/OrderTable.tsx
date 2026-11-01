"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import { formatDateTimeShort, formatNumber, formatRupiah } from "@/lib/format";
import type { SalesOrderStatus } from "@/lib/store/types";
import { getNextOrderStatuses } from "@/features/pesanan/data/pesanan-calculations";
import type { OrderRow } from "@/features/pesanan/types";

const STATUS_TONES: Record<SalesOrderStatus, BadgeTone> = {
  "Belum sinkron": "warning",
  "Menunggu bayar": "brand",
  Lunas: "success",
  Dibatalkan: "danger",
};

interface OrderTableProps {
  rows: readonly OrderRow[];
  canManage: boolean;
  canDelete: boolean;
  showSales: boolean;
  title: string;
  onStatusChange: (row: OrderRow, status: SalesOrderStatus) => void;
  onDelete: (row: OrderRow) => void;
}

export function OrderTable({
  rows,
  canManage,
  canDelete,
  showSales,
  title,
  onStatusChange,
  onDelete,
}: OrderTableProps) {
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
      cell: (order) => {
        const nextStatuses = getNextOrderStatuses(order.status);

        return canManage ? (
          <Select
            aria-label={`Status pesanan ${order.orderNumber}`}
            value={order.status}
            disabled={nextStatuses.length === 0}
            onChange={(event) =>
              onStatusChange(order, event.target.value as SalesOrderStatus)
            }
            className="h-8 w-[158px] px-1.5 text-label"
          >
            <option value={order.status} disabled>
              {order.status}
            </option>
            {nextStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        ) : (
          <StatusBadge tone={STATUS_TONES[order.status]}>
            {order.status}
          </StatusBadge>
        );
      },
    });

    if (canDelete) {
      base.push({
        id: "actions",
        header: "Aksi",
        align: "right",
        cell: (order) => (
          <Button
            variant="dangerOutline"
            size="sm"
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
        ),
      });
    }

    return base;
  }, [canDelete, canManage, onDelete, onStatusChange, showSales]);

  return (
    <Card className="p-5">
      <CardHeader
        title={title}
        subtitle="Status lunas otomatis mengurangi stok cabang. Pesanan yang sudah dibatalkan bisa dihapus."
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
        <DataTable
          ariaLabel={title}
          columns={columns}
          rows={rows}
          rowKey={(order) => order.id}
          minWidth={showSales ? 720 : 560}
          density="roomy"
          headerTone="soft"
        />
      )}
    </Card>
  );
}
