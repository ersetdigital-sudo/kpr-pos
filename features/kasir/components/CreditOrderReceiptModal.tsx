"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getDatabase } from "@/lib/store/store";
import { formatDateLong, formatDateTimeLong, formatPercent, formatRupiah } from "@/lib/format";
import type { SalesOrder } from "@/lib/store/types";

interface CreditOrderReceiptModalProps {
  order: SalesOrder | null;
  onClose: () => void;
}

/**
 * Struk pesanan COD/Tempo. Dipakai saat kasir memproses pesanan: pelanggan
 * menerima bukti pesanan beserta jatuh tempo, bukan struk lunas.
 */
export function CreditOrderReceiptModal({
  order,
  onClose,
}: CreditOrderReceiptModalProps) {
  if (!order) return null;

  const database = getDatabase();
  const branch = database.branches.find((item) => item.id === order.branchId);
  const sales = database.employees.find(
    (item) => item.id === order.salesEmployeeId,
  );
  const paperSize = database.settings.receipt.paperSize;
  const subtotal = order.items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  const discount = order.items.reduce(
    (total, item) => total + (item.discountAmount ?? 0),
    0,
  );
  const isTempo = order.paymentScheme === "tempo";

  const paper = (
    <div
      className="bg-white px-3 py-4 text-ink"
      style={{ width: `${paperSize}mm`, maxWidth: "100%" }}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <Image
          src={database.settings.business.logoUrl || "/logo-kpr.png"}
          alt="Logo usaha"
          width={48}
          height={50}
          unoptimized
          className="object-contain"
        />
        <div className="text-[13px] leading-tight font-bold">
          {database.settings.business.name}
        </div>
        <div className="text-[10px] leading-tight">{branch?.name ?? "-"}</div>
        <div className="text-[10px] leading-tight">{branch?.address ?? ""}</div>
        <div className="text-[10px] leading-tight">
          {database.settings.business.phone}
        </div>
      </div>

      <div className="my-2 border-t border-dashed border-ink/30" />

      <div className="flex flex-col gap-0.5 text-[10px]">
        <div className="flex justify-between gap-2">
          <span>No. Pesanan</span>
          <span className="text-right font-semibold">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Tanggal</span>
          <span className="text-right">
            {formatDateTimeLong(order.processedAt ?? order.createdAt)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Pelanggan</span>
          <span className="text-right">{order.customerName}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Sales</span>
          <span className="text-right">{sales?.name ?? "Tanpa sales"}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Pembayaran</span>
          <span className="text-right font-semibold">
            {isTempo ? `Tempo ${order.tempoDays ?? ""} hari` : "COD"}
          </span>
        </div>
        {order.dueDate ? (
          <div className="flex justify-between gap-2">
            <span>Jatuh tempo</span>
            <span className="text-right font-semibold">
              {formatDateLong(order.dueDate)}
            </span>
          </div>
        ) : null}
        {order.note ? (
          <div className="flex justify-between gap-2">
            <span>Catatan</span>
            <span className="text-right">{order.note}</span>
          </div>
        ) : null}
      </div>

      <div className="my-2 border-t border-dashed border-ink/30" />

      <div className="flex flex-col gap-2">
        {order.items.map((item, index) => (
          <div
            key={`${item.productId}-${index}`}
            className="flex justify-between gap-2 text-[10px]"
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{item.productName}</div>
              <div>
                {item.quantity} × {formatRupiah(item.unitPrice)}
                {item.discountAmount
                  ? ` · diskon ${formatRupiah(item.discountAmount)}`
                  : ""}
              </div>
            </div>
            <div className="shrink-0 font-semibold">
              {formatRupiah(
                item.unitPrice * item.quantity - (item.discountAmount ?? 0),
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="my-2 border-t border-dashed border-ink/30" />

      <div className="flex flex-col gap-1 text-[10px]">
        <div className="flex justify-between gap-2">
          <span>Subtotal</span>
          <span>{formatRupiah(subtotal)}</span>
        </div>
        {discount > 0 ? (
          <div className="flex justify-between gap-2">
            <span>Diskon</span>
            <span>- {formatRupiah(discount)}</span>
          </div>
        ) : null}
        {order.taxEnabled && order.taxAmount > 0 ? (
          <div className="flex justify-between gap-2">
            <span>PPN {formatPercent(order.taxRate)}</span>
            <span>{formatRupiah(order.taxAmount)}</span>
          </div>
        ) : null}
        {order.shippingMethod !== "pickup" ? (
          <div className="flex justify-between gap-2">
            <span>Ongkir</span>
            <span>
              {order.shippingMethod === "free"
                ? "Gratis ongkir"
                : formatRupiah(order.shippingCost)}
            </span>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 border-t border-ink/20 pt-1 text-[12px] font-bold">
          <span>Total</span>
          <span>{formatRupiah(order.total)}</span>
        </div>
      </div>

      <div className="mt-3 border-t border-dashed border-ink/30 pt-2 text-center text-[9px] leading-tight">
        {isTempo
          ? "Barang sudah diserahkan. Mohon lunasi sebelum tanggal jatuh tempo."
          : "Barang sudah diserahkan. Pembayaran dilakukan saat pengiriman."}
        <div className="mt-1 font-semibold">
          *** Belum lunas · bukan bukti pembayaran ***
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={isTempo ? "Bukti Pesanan Tempo" : "Bukti Pesanan COD"}
        description={`${order.orderNumber} · ${order.customerName}`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              Cetak / Simpan PDF
            </Button>
          </>
        }
      >
        <div className="flex justify-center bg-canvas p-3">{paper}</div>
      </Modal>

      {typeof document !== "undefined"
        ? createPortal(
            <div id="receipt-print-root" className="hidden" aria-hidden="true">
              <div className="flex justify-center">{paper}</div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
