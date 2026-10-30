"use client";

import { useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import { formatDateTimeShort, formatNumber, formatRupiah } from "@/lib/format";
import type { SalesOrderStatus } from "@/lib/store/types";
import { ORDER_STATUS_OPTIONS } from "@/features/pesanan/data/pesanan-calculations";
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
  showSales: boolean;
  title: string;
  onStatusChange: (row: OrderRow, status: SalesOrderStatus) => void;
}

export function OrderTable({
  rows,
  canManage,
  showSales,
  title,
  onStatusChange,
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
          <div>
            <div className="text-ink">{order.customerName}</div>
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
      cell: (order) =>
        canManage ? (
          <Select
            aria-label={`Status pesanan ${order.orderNumber}`}
            value={order.status}
            onChange={(event) =>
              onStatusChange(order, event.target.value as SalesOrderStatus)
            }
            className="h-8 w-[158px] px-1.5 text-label"
          >
            {ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        ) : (
          <StatusBadge tone={STATUS_TONES[order.status]}>
            {order.status}
          </StatusBadge>
        ),
    });

    return base;
  }, [canManage, onStatusChange, showSales]);

  return (
    <Card className="p-5">
      <CardHeader
        title={title}
        subtitle="Status lunas otomatis mengurangi stok cabang."
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
          minWidth={showSales ? 760 : 560}
          density="roomy"
          headerTone="soft"
        />
      )}
    </Card>
  );
}
