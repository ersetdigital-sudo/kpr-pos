"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import type { SalesOrderStatus } from "@/lib/store/types";
import { getNextOrderStatuses } from "@/features/pesanan/data/pesanan-calculations";
import { OrderStatusBadge } from "@/features/pesanan/components/OrderStatusBadge";
import type { OrderRow } from "@/features/pesanan/types";

const TRANSITION_HINTS: Record<SalesOrderStatus, string> = {
  "Belum sinkron": "Pesanan belum tersinkron; belum mengubah stok.",
  "Menunggu bayar": "Pesanan menunggu pembayaran; stok belum berubah.",
  "COD - menunggu pembayaran":
    "COD sudah diproses. Gunakan aksi Tandai lunas atau Batalkan di daftar pesanan.",
  "Tempo - menunggu pembayaran":
    "Tempo sudah diproses. Gunakan aksi Tandai lunas atau Batalkan di daftar pesanan.",
  Lunas: "Pesanan ditandai lunas dan stok cabang berkurang.",
  Dibatalkan: "Pesanan dibatalkan dan stok yang terpotong dikembalikan.",
};

interface OrderStatusDialogProps {
  order: OrderRow;
  onClose: () => void;
  onSelect: (status: SalesOrderStatus) => void;
}

function describeTransition(order: OrderRow, status: SalesOrderStatus): string {
  if (status === "Dibatalkan" && order.transactionId) {
    return `${TRANSITION_HINTS[status]} Transaksi kasir terkait ikut direfund.`;
  }

  return TRANSITION_HINTS[status];
}

/**
 * Dialog pilihan perubahan status. Hanya status yang boleh dituju dari status
 * saat ini yang ditampilkan, mengikuti aturan transisi yang sama dengan aksi.
 */
export function OrderStatusDialog({
  order,
  onClose,
  onSelect,
}: OrderStatusDialogProps) {
  const nextStatuses = getNextOrderStatuses(order.status);

  return (
    <Modal
      open
      onClose={onClose}
      title="Ubah status pesanan"
      description={`${order.orderNumber} · ${order.customerName}`}
      size="sm"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-label text-ink-muted">
          <span>Status sekarang</span>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="flex flex-col gap-2">
          {nextStatuses.map((status) => {
            const isCancel = status === "Dibatalkan";

            return (
              <button
                key={status}
                type="button"
                onClick={() => onSelect(status)}
                className={cn(
                  "flex w-full cursor-pointer flex-col gap-1 rounded-control border px-3 py-2.5 text-left font-sans",
                  isCancel
                    ? "border-danger-line bg-danger-soft hover:bg-danger-line/40"
                    : "border-line bg-canvas hover:bg-line-subtle",
                )}
              >
                <span
                  className={cn(
                    "text-label font-semibold",
                    isCancel ? "text-danger-ink" : "text-ink",
                  )}
                >
                  {isCancel ? "Batalkan pesanan" : `Tandai ${status.toLowerCase()}`}
                </span>
                <span className="text-meta text-ink-muted">
                  {describeTransition(order, status)}
                </span>
              </button>
            );
          })}
        </div>

        <p className="m-0 text-meta text-ink-muted">
          Perubahan status langsung tersimpan dan tercatat di Log Aktivitas.
        </p>
      </div>
    </Modal>
  );
}
