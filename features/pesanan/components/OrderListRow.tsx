"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatDateShort,
  formatDateTimeShort,
  formatNumber,
  formatRupiah,
} from "@/lib/format";
import {
  canSettleCreditOrder,
  getNextOrderStatuses,
  isCreditPendingStatus,
} from "@/features/pesanan/data/pesanan-calculations";
import { OrderStatusBadge } from "@/features/pesanan/components/OrderStatusBadge";
import type {
  OrderRow,
  ScopePermissions,
} from "@/features/pesanan/types";

interface OrderListItemProps {
  order: OrderRow;
  permissions: ScopePermissions;
  canDelete: boolean;
  showSales: boolean;
  onStatusChange: () => void;
  onDelete: () => void;
  onViewDetail: () => void;
  onSettle: () => void;
  onCancelCredit: () => void;
}

function OverdueBadge() {
  return (
    <StatusBadge tone="danger" strong>
      Jatuh tempo
    </StatusBadge>
  );
}

function creditLabel(order: OrderRow): string | null {
  if (order.status === "COD - menunggu pembayaran") {
    return "COD · menunggu pembayaran saat pengiriman";
  }
  if (order.status === "Tempo - menunggu pembayaran") {
    return order.dueDate
      ? `Tempo ${order.tempoDays ?? ""} hari · jatuh tempo ${formatDateShort(order.dueDate)}`
      : `Tempo ${order.tempoDays ?? ""} hari`;
  }

  return null;
}

function OrderActions({
  order,
  permissions,
  canDelete,
  compact,
  onStatusChange,
  onDelete,
  onViewDetail,
  onSettle,
  onCancelCredit,
}: Omit<OrderListItemProps, "showSales"> & { compact: boolean }) {
  const creditPending = isCreditPendingStatus(order.status);
  const canSettle =
    creditPending && canSettleCreditOrder(order.paymentScheme, permissions);
  const canCancel =
    creditPending &&
    (permissions.canManageSalesOrders ||
      permissions.canSettleCod ||
      permissions.canSettleTempo);
  const canChangeStatus =
    !creditPending &&
    permissions.canManageSalesOrders &&
    getNextOrderStatuses(order.status).length > 0;
  const deletable =
    canDelete &&
    (order.status === "Dibatalkan" || permissions.canDeleteTransaction);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        variant="outline"
        size={compact ? "md" : "sm"}
        className={compact ? "h-10 flex-1 text-label" : "h-[32px] px-2.5 text-meta"}
        onClick={onViewDetail}
      >
        Detail
      </Button>

      {canSettle ? (
        <Button
          variant="primary"
          size={compact ? "md" : "sm"}
          className={compact ? "h-10 flex-1 text-label" : "h-[32px] px-2.5 text-meta"}
          onClick={onSettle}
        >
          Tandai lunas
        </Button>
      ) : null}

      {canCancel ? (
        <Button
          variant="dangerOutline"
          size={compact ? "md" : "sm"}
          className={compact ? "h-10 flex-1 text-label" : "h-[32px] px-2.5 text-meta"}
          onClick={onCancelCredit}
        >
          Batalkan
        </Button>
      ) : null}

      {canChangeStatus ? (
        <Button
          variant="outline"
          size={compact ? "md" : "sm"}
          className={compact ? "h-10 flex-1 text-label" : "h-[32px] px-2.5 text-meta"}
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

      {deletable ? (
        <Button
          variant="dangerOutline"
          size={compact ? "md" : "sm"}
          className={
            compact
              ? "h-10 w-[42px] shrink-0 px-0"
              : "h-[32px] px-2.5 text-meta"
          }
          title={`Hapus pesanan ${order.orderNumber}`}
          aria-label={`Hapus pesanan ${order.orderNumber}`}
          onClick={onDelete}
        >
          <Icon name="trash" size={14} />
          {compact ? null : "Hapus"}
        </Button>
      ) : null}
    </div>
  );
}

/** Baris pesanan versi desktop; informasi dibuat dua baris agar tetap lega. */
export function OrderListRow(props: OrderListItemProps) {
  const { order, showSales, onViewDetail } = props;
  const creditInfo = creditLabel(order);

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

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-meta text-ink-muted">
            {formatDateTimeShort(order.createdAt)}
          </span>
          <OrderStatusBadge status={order.status} />
          {order.isOverdue ? <OverdueBadge /> : null}
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
          {creditInfo ? <span className="text-ink-soft">{creditInfo}</span> : null}
          {order.status === "Lunas" && order.settledByName ? (
            <span>Dilunasi {order.settledByName}</span>
          ) : null}
        </div>

        <OrderActions {...props} compact={false} onViewDetail={onViewDetail} />
      </div>
    </div>
  );
}

/** Kartu pesanan versi mobile; pengganti tabel tanpa scroll horizontal. */
export function OrderCard(props: OrderListItemProps) {
  const { order, showSales, onViewDetail } = props;
  const creditInfo = creditLabel(order);

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
        <div className="flex shrink-0 flex-col items-end gap-1">
          <OrderStatusBadge status={order.status} />
          {order.isOverdue ? <OverdueBadge /> : null}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 text-meta text-ink-muted">
          <div className="text-label font-semibold text-ink">
            {formatNumber(order.quantity)} pcs
            {showSales && order.salesName ? ` · ${order.salesName}` : ""}
          </div>
          {showSales ? <div className="truncate">{order.branchName}</div> : null}
          {creditInfo ? <div>{creditInfo}</div> : null}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-meta text-ink-muted">Total</div>
          <div className="text-card-title font-extrabold whitespace-nowrap text-ink">
            {formatRupiah(order.total)}
          </div>
        </div>
      </div>

      <div className="border-t border-line-faint pt-3">
        <OrderActions {...props} compact onViewDetail={onViewDetail} />
      </div>
    </div>
  );
}
