"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDateTimeLong, formatRupiah } from "@/lib/format";
import type { SalesOrder } from "@/lib/store/types";

interface OrderDetailModalProps {
  order: SalesOrder | null;
  salesName: string;
  branchName: string;
  canProcess: boolean;
  onProcess: () => void;
  onClose: () => void;
}

export function OrderDetailModal({
  order,
  salesName,
  branchName,
  canProcess,
  onProcess,
  onClose,
}: OrderDetailModalProps) {
  if (!order) return null;

  const pending =
    order.status === "Menunggu bayar" || order.status === "Belum sinkron";
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
            <dd className="m-0 font-semibold text-ink">{order.status}</dd>
          </div>
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
                              : "nominal"}
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
          <div className="flex justify-between text-body font-bold text-ink">
            <span>Total</span>
            <span>{formatRupiah(order.total)}</span>
          </div>
        </div>

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
