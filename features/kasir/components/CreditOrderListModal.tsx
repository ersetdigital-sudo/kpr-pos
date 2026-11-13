"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { isOverdueTempoSalesOrder } from "@/lib/store/sales";
import { formatDateShort, formatDateTimeShort, formatRupiah } from "@/lib/format";
import { DocumentPrintButtons } from "@/features/documents/components/DocumentPrintButtons";
import type { SalesOrder } from "@/lib/store/types";

interface CreditOrderListModalProps {
  open: boolean;
  orders: readonly SalesOrder[];
  canSettleCod: boolean;
  canSettleTempo: boolean;
  canCancel: boolean;
  canPrint: boolean;
  onClose: () => void;
  onSettle: (order: SalesOrder) => void;
  onCancel: (order: SalesOrder) => void;
}

/** Daftar COD/Tempo yang belum lunas, dipakai kasir menagih & melunasi. */
export function CreditOrderListModal({
  open,
  orders,
  canSettleCod,
  canSettleTempo,
  canCancel,
  canPrint,
  onClose,
  onSettle,
  onCancel,
}: CreditOrderListModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Piutang COD & Tempo"
      description="Pesanan yang sudah diproses tetapi uangnya belum diterima. Pelunasan otomatis masuk Buku Kas."
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      {orders.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            Tidak ada piutang
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            Semua pesanan COD/Tempo cabang ini sudah lunas.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line-faint rounded-control border border-line">
          {orders.map((order) => {
            const isTempo = order.paymentScheme === "tempo";
            const canSettle = isTempo ? canSettleTempo : canSettleCod;
            const overdue = isOverdueTempoSalesOrder(order);

            return (
              <li key={order.id} className="flex flex-col gap-2 px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-body font-semibold text-ink">
                        {order.customerName}
                      </span>
                      <StatusBadge tone={isTempo ? "warning" : "info"}>
                        {isTempo ? "Tempo" : "COD"}
                      </StatusBadge>
                      {overdue ? (
                        <StatusBadge tone="danger" strong>
                          Jatuh tempo
                        </StatusBadge>
                      ) : null}
                    </div>
                    <p className="m-0 text-meta text-ink-muted">
                      {order.orderNumber} ·{" "}
                      {formatDateTimeShort(order.processedAt ?? order.createdAt)}
                      {order.dueDate
                        ? ` · jatuh tempo ${formatDateShort(order.dueDate)}`
                        : " · bayar saat pengiriman"}
                    </p>
                  </div>
                  <span className="text-body font-bold whitespace-nowrap text-ink">
                    {formatRupiah(order.total)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <DocumentPrintButtons
                    canPrint={canPrint}
                    invoiceSource={{
                      sourceType: "sales_order",
                      sourceId: order.id,
                    }}
                    deliveryNoteSource={{
                      sourceType: "sales_order",
                      sourceId: order.id,
                    }}
                  />
                  {canSettle ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onSettle(order)}
                    >
                      Tandai lunas
                    </Button>
                  ) : null}
                  {canCancel ? (
                    <Button
                      variant="dangerOutline"
                      size="sm"
                      onClick={() => onCancel(order)}
                    >
                      Batalkan
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
