"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatDateTimeShort, formatNumber, formatRupiah } from "@/lib/format";
import { getNextOrderStatuses } from "@/features/pesanan/data/pesanan-calculations";
import { OrderStatusBadge } from "@/features/pesanan/components/OrderStatusBadge";
import type { OrderRow } from "@/features/pesanan/types";

interface OrderListItemProps {
  order: OrderRow;
  canManage: boolean;
  canDelete: boolean;
  showSales: boolean;
  onStatusChange: () => void;
  onDelete: () => void;
  onViewDetail: () => void;
}

/** Baris pesanan versi desktop; informasi dibuat dua baris agar tetap lega. */
export function OrderListRow({
  order,
  canManage,
  canDelete,
  showSales,
  onStatusChange,
  onDelete,
  onViewDetail,
}: OrderListItemProps) {
  const canChangeStatus =
    canManage && getNextOrderStatuses(order.status).length > 0;

  return (
    <div className="hidden flex-col gap-2.5 px-4 py-3.5 transition-colors hover:bg-line-subtle lg:flex">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <p className="m-0 truncate text-body font-semibold text-ink">
              {order.customerName}
            </p>
            <span className="text-meta text-ink-muted">{order.orderNumber}</span>
          </div>
          {order.customerPhone ? (
            <p className="m-0 text-meta text-ink-muted">{order.customerPhone}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-meta text-ink-muted">
            {formatDateTimeShort(order.createdAt)}
          </span>
          <OrderStatusBadge status={order.status} />
          <span className="text-body font-bold whitespace-nowrap text-ink">
            {formatRupiah(order.total)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-ink-muted">
          <span className="font-semibold text-ink">
            {formatNumber(order.quantity)} pcs
          </span>
          {showSales ? (
            <>
              <span>
                Sales <span className="text-ink">{order.salesName}</span>
              </span>
              <span>
                Cabang <span className="text-ink">{order.branchName}</span>
              </span>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-[32px] px-2.5 text-meta"
            onClick={onViewDetail}
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
              onClick={onStatusChange}
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
              onClick={onDelete}
            >
              <Icon name="trash" size={14} />
              Hapus
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Kartu pesanan versi mobile; pengganti tabel tanpa scroll horizontal. */
export function OrderCard({
  order,
  canManage,
  canDelete,
  showSales,
  onStatusChange,
  onDelete,
  onViewDetail,
}: OrderListItemProps) {
  const canChangeStatus =
    canManage && getNextOrderStatuses(order.status).length > 0;

  return (
    <div className="flex flex-col gap-3 px-4 py-4 lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 truncate text-body font-semibold text-ink">
            {order.customerName}
          </p>
          <p className="m-0 text-meta text-ink-muted">
            {order.orderNumber} · {formatDateTimeShort(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} className="shrink-0" />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 text-meta text-ink-muted">
          <div className="text-label font-semibold text-ink">
            {formatNumber(order.quantity)} pcs
            {showSales && order.salesName ? ` · ${order.salesName}` : ""}
          </div>
          {showSales ? <div className="truncate">{order.branchName}</div> : null}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-meta text-ink-muted">Total</div>
          <div className="text-card-title font-extrabold whitespace-nowrap text-ink">
            {formatRupiah(order.total)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line-faint pt-3">
        <Button
          variant="outline"
          size="sm"
          className="h-[36px] flex-1 text-label"
          onClick={onViewDetail}
        >
          Detail
        </Button>

        {canChangeStatus ? (
          <Button
            variant="outline"
            size="sm"
            className="h-[36px] flex-1 text-label"
            aria-haspopup="dialog"
            aria-label={`Ubah status pesanan ${order.orderNumber}`}
            onClick={onStatusChange}
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
            className="h-[36px] w-[40px] shrink-0 px-0"
            disabled={order.status !== "Dibatalkan"}
            aria-label={`Hapus pesanan ${order.orderNumber}`}
            title={
              order.status === "Dibatalkan"
                ? `Hapus pesanan ${order.orderNumber}`
                : "Batalkan pesanan dulu untuk menghapus"
            }
            onClick={onDelete}
          >
            <Icon name="trash" size={15} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
