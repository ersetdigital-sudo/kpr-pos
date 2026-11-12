"use client";

import Image from "next/image";
import { formatDateTimeLong, formatPercent, formatRupiah } from "@/lib/format";
import { shippingChargeLabel } from "@/lib/store/charges";
import type { ReceiptViewData } from "@/features/kasir/types";

export function ReceiptPaper({ receipt }: { receipt: ReceiptViewData }) {
  const { transaction } = receipt;
  const compact = receipt.paperSize === 58;

  return (
    <div
      className="receipt-paper bg-white px-3 py-4 text-ink"
      style={{ width: `${receipt.paperSize}mm`, maxWidth: "100%" }}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <Image
          src={receipt.logoUrl || "/logo-kpr.png"}
          alt="Logo usaha"
          width={compact ? 44 : 52}
          height={compact ? 46 : 54}
          unoptimized
          className="object-contain"
        />
        <div
          className={
            compact
              ? "text-[12px] leading-tight font-bold"
              : "text-[13px] leading-tight font-bold"
          }
        >
          {receipt.businessName}
        </div>
        <div className="text-[10px] leading-tight">{receipt.branchName}</div>
        <div className="text-[10px] leading-tight">
          {receipt.branchAddress}
        </div>
        <div className="text-[10px] leading-tight">
          {receipt.businessPhone}
        </div>
      </div>

      <div className="my-2 border-t border-dashed border-ink/30" />

      <div className="flex flex-col gap-0.5 text-[10px]">
        <div className="flex justify-between gap-2">
          <span>No. Struk</span>
          <span className="text-right font-semibold">
            {transaction.invoiceNumber}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Tanggal</span>
          <span className="text-right">
            {formatDateTimeLong(transaction.createdAt)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Kasir</span>
          <span className="text-right">{receipt.cashierName}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Sales</span>
          <span className="text-right">
            {receipt.salesName ?? "Tanpa sales"}
          </span>
        </div>
        {receipt.customerName ? (
          <div className="flex justify-between gap-2">
            <span>Pelanggan</span>
            <span className="text-right">{receipt.customerName}</span>
          </div>
        ) : null}
        {receipt.note ? (
          <div className="flex justify-between gap-2">
            <span>Catatan</span>
            <span className="text-right">{receipt.note}</span>
          </div>
        ) : null}
      </div>

      <div className="my-2 border-t border-dashed border-ink/30" />

      <div className="flex flex-col gap-2">
        {transaction.items.map((item) => (
          <div
            key={item.productId}
            className="flex justify-between gap-2 text-[10px]"
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{item.productName}</div>
              <div>
                {item.quantity} × {formatRupiah(item.unitPrice)}
                {item.priceType === "wholesale" ? " (grosir)" : ""}
              </div>
              {item.discountAmount ? (
                <div className="text-danger-ink">
                  Diskon{" "}
                  {item.discountType === "percent"
                    ? `${item.discountValue ?? 0}%`
                    : `${formatRupiah(item.discountValue ?? 0)}/pcs`}
                  {" · -"}
                  {formatRupiah(item.discountAmount)}
                </div>
              ) : null}
            </div>
            <div className="shrink-0 font-semibold">
              {formatRupiah(item.lineTotal)}
            </div>
          </div>
        ))}
      </div>

      <div className="my-2 border-t border-dashed border-ink/30" />

      <div className="flex flex-col gap-1 text-[10px]">
        <div className="flex justify-between gap-2">
          <span>Subtotal</span>
          <span>{formatRupiah(transaction.subtotal)}</span>
        </div>
        {transaction.discount.amount > 0 ? (
          <div className="flex justify-between gap-2">
            <span>Diskon</span>
            <span>- {formatRupiah(transaction.discount.amount)}</span>
          </div>
        ) : null}
        {transaction.taxEnabled && transaction.taxAmount > 0 ? (
          <div className="flex justify-between gap-2">
            <span>PPN {formatPercent(transaction.taxRate)}</span>
            <span>{formatRupiah(transaction.taxAmount)}</span>
          </div>
        ) : null}
        {transaction.shippingMethod !== "pickup" ? (
          <div className="flex justify-between gap-2">
            <span>Ongkir</span>
            <span>
              {transaction.shippingMethod === "free"
                ? "Gratis ongkir"
                : formatRupiah(transaction.shippingCost)}
            </span>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 border-t border-ink/20 pt-1 text-[12px] font-bold">
          <span>Total</span>
          <span>{formatRupiah(transaction.total)}</span>
        </div>
        <div className="mt-1 flex justify-between gap-2">
          <span>Pembayaran</span>
          <span className="text-right font-semibold">
            {transaction.payment.method}
            {receipt.bankName ? ` · ${receipt.bankName}` : ""}
          </span>
        </div>
        {transaction.payment.cashReceived !== undefined ? (
          <>
            <div className="flex justify-between gap-2">
              <span>Uang diterima</span>
              <span>{formatRupiah(transaction.payment.cashReceived)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Kembalian</span>
              <span>{formatRupiah(transaction.payment.change ?? 0)}</span>
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-3 border-t border-dashed border-ink/30 pt-2 text-center text-[10px] whitespace-pre-line">
        {receipt.footerText}
      </div>
      <div className="mt-2 text-center text-[10px] font-semibold">
        *** Terima kasih ***
      </div>
    </div>
  );
}
