"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocumentPrintButtons } from "@/features/documents/components/DocumentPrintButtons";
import {
  formatDateShort,
  formatDateTimeLong,
  formatPercent,
  formatRupiah,
} from "@/lib/format";
import { isOverdueTempoSalesOrder } from "@/lib/store/sales";
import type { SalesOrder } from "@/lib/store/types";

interface OrderDetailModalProps {
  order: SalesOrder | null;
  salesName: string;
  branchName: string;
  /** Nomor invoice kasir yang melunasi pesanan, bila ada. */
  transactionNumber?: string | null;
  canProcess: boolean;
  canPrint: boolean;
  onProcess: () => void;
  onClose: () => void;
}

export function OrderDetailModal({
  order,
  salesName,
  branchName,
  transactionNumber,
  canProcess,
  canPrint,
  onProcess,
  onClose,
}: OrderDetailModalProps) {
  if (!order) return null;

  const pending =
    order.status === "Menunggu bayar" || order.status === "Belum sinkron";
  const schemeLabel =
    order.paymentScheme === "cod"
      ? "COD (bayar saat pengiriman)"
      : order.paymentScheme === "tempo"
        ? `Tempo ${order.tempoDays ?? ""} hari`
        : "Tunai";
  const overdue = isOverdueTempoSalesOrder(order);
  const subtotal = order.items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  const discount = order.items.reduce(
    (total, item) => total + (item.discountAmount ?? 0),
    0,
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={`Pesanan ${order.orderNumber}`}
      description={`${order.customerName} · ${formatDateTimeLong(order.createdAt)}`}
      size="lg"
      footer={
        <>
          <DocumentPrintButtons
            canPrint={canPrint}
            invoiceSource={{ sourceType: "sales_order", sourceId: order.id }}
            deliveryNoteSource={{
              sourceType: "sales_order",
              sourceId: order.id,
            }}
            className="mr-auto flex flex-wrap items-center gap-1.5"
          />
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          {canProcess && pending ? (
            <Button variant="primary" onClick={onProcess}>
              Proses ke Kasir
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <dl className="grid gap-2 rounded-control bg-canvas p-3 text-label sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Pelanggan</dt>
            <dd className="m-0 font-semibold text-ink">
              {order.customerName}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">No. HP</dt>
            <dd className="m-0 text-ink">{order.customerPhone || "-"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Sales</dt>
            <dd className="m-0 text-ink">{salesName}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Cabang</dt>
            <dd className="m-0 text-ink">{branchName}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Status</dt>
            <dd className="m-0 flex flex-wrap items-center gap-1.5 font-semibold text-ink">
              {order.status}
              {overdue ? <StatusBadge tone="danger" strong>Jatuh tempo</StatusBadge> : null}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Pembayaran</dt>
            <dd className="m-0 text-ink">{schemeLabel}</dd>
          </div>
          {order.dueDate ? (
            <div>
              <dt className="text-ink-muted">Jatuh tempo</dt>
              <dd className="m-0 text-ink">{formatDateShort(order.dueDate)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-ink-muted">Transaksi</dt>
            <dd className="m-0 text-ink">
              {transactionNumber ??
                (order.paidAt
                  ? "Pelunasan langsung (COD/Tempo)"
                  : "Belum ada pembayaran")}
            </dd>
          </div>
          {order.paidAt ? (
            <div>
              <dt className="text-ink-muted">Dilunasi</dt>
              <dd className="m-0 text-ink">
                {formatDateTimeLong(order.paidAt)}
                {order.settledByName ? ` · ${order.settledByName}` : ""}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-ink-muted">Catatan</dt>
            <dd className="m-0 text-ink">{order.note || "-"}</dd>
          </div>
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-label">
            <thead>
              <tr className="bg-line-subtle text-left text-meta text-ink-muted">
                <th className="px-2 py-2 font-semibold">Produk</th>
                <th className="px-2 py-2 text-right font-semibold">Harga</th>
                <th className="px-2 py-2 text-right font-semibold">Qty</th>
                <th className="px-2 py-2 text-right font-semibold">Diskon</th>
                <th className="px-2 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => {
                const gross = item.unitPrice * item.quantity;
                const itemDiscount = item.discountAmount ?? 0;

                return (
                  <tr
                    key={`${item.productId}-${index}`}
                    className="border-t border-line-faint"
                  >
                    <td className="px-2 py-2">
                      <div className="font-semibold text-ink">
                        {item.productName}
                      </div>
                      <div className="text-meta text-ink-muted">
                        {item.priceType === "wholesale"
                          ? "Harga grosir"
                          : "Harga ecer"}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right text-ink">
                      {formatRupiah(item.unitPrice)}
                    </td>
                    <td className="px-2 py-2 text-right text-ink">
                      {item.quantity}
                    </td>
                    <td className="px-2 py-2 text-right text-ink-soft">
                      {itemDiscount > 0 ? (
                        <div>
                          <div>- {formatRupiah(itemDiscount)}</div>
                          <div className="text-meta text-ink-muted">
                            {item.discountType === "percent"
                              ? `${item.discountValue ?? 0}%`
                              : `${formatRupiah(item.discountValue ?? 0)}/pcs`}
                          </div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-ink">
                      {formatRupiah(gross - itemDiscount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-1 border-t border-dashed border-line-strong pt-2 text-label">
          <div className="flex justify-between">
            <span className="text-ink-muted">Subtotal</span>
            <span className="text-ink">{formatRupiah(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Total diskon</span>
            <span className="text-ink">- {formatRupiah(discount)}</span>
          </div>
          {order.taxEnabled && order.taxAmount > 0 ? (
            <div className="flex justify-between">
              <span className="text-ink-muted">
                PPN {formatPercent(order.taxRate)}
              </span>
              <span className="text-ink">{formatRupiah(order.taxAmount)}</span>
            </div>
          ) : null}
          {order.shippingMethod !== "pickup" ? (
            <div className="flex justify-between">
              <span className="text-ink-muted">Ongkir</span>
              <span className="text-ink">
                {order.shippingMethod === "free"
                  ? "Gratis ongkir"
                  : formatRupiah(order.shippingCost)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between text-body font-bold text-ink">
            <span>Total</span>
            <span>{formatRupiah(order.total)}</span>
          </div>
        </div>

        {order.processedAt && !order.transactionId ? (
          <p className="m-0 rounded-control bg-canvas px-3 py-2 text-meta text-ink-muted">
            Rincian item di atas sudah final sejak pesanan diproses
            {order.processedAt
              ? ` (${formatDateTimeLong(order.processedAt)})`
              : ""}
            . Pemasukannya masuk Buku Kas saat pesanan ditandai lunas.
          </p>
        ) : null}

        {!canProcess && pending ? (
          <p className="m-0 rounded-control bg-canvas px-3 py-2 text-meta text-ink-muted">
            Pembayaran diproses oleh kasir. Buka menu Kasir lalu pilih pesanan
            ini.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
