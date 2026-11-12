"use client";

import { CashPayment } from "@/features/kasir/components/CashPayment";
import { QrisPayment } from "@/features/kasir/components/QrisPayment";
import { TransferPayment } from "@/features/kasir/components/TransferPayment";
import { cn } from "@/lib/cn";
import type { BankAccount } from "@/lib/store/types";
import type { CashierPaymentMethod } from "@/features/kasir/types";
import type { ReactNode } from "react";

interface PaymentSectionProps {
  total: number;
  methods: readonly CashierPaymentMethod[];
  method: CashierPaymentMethod;
  onMethodChange: (method: CashierPaymentMethod) => void;
  cashReceived: number;
  onCashReceivedChange: (value: number) => void;
  bankAccounts: readonly BankAccount[];
  selectedBankId: string;
  onBankChange: (accountId: string) => void;
  /** Panel COD/Tempo; hanya dikirim saat pesanan sales sedang dibayar. */
  creditPanel?: ReactNode;
}

export function PaymentSection({
  total,
  methods,
  method,
  onMethodChange,
  cashReceived,
  onCashReceivedChange,
  bankAccounts,
  selectedBankId,
  onBankChange,
  creditPanel,
}: PaymentSectionProps) {
  return (
    <div className="flex flex-col gap-[10px] px-5 pb-3.5">
      <div className="text-meta font-semibold text-ink-muted">
        Metode pembayaran
      </div>

      {methods.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong px-3 py-3 text-center text-meta text-ink-muted">
          Belum ada metode pembayaran aktif.
        </div>
      ) : (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${Math.min(methods.length, 3)}, minmax(0, 1fr))`,
          }}
        >
          {methods.map((option) => {
            const active = option === method;

            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onMethodChange(option)}
                className={cn(
                  "h-[46px] cursor-pointer rounded-control-lg font-sans text-body font-bold text-ink",
                  active
                    ? "border-2 border-brand bg-brand-soft"
                    : "border border-line-strong bg-surface",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}

      {method === "Cash" && methods.includes("Cash") ? (
        <CashPayment
          total={total}
          received={cashReceived}
          onReceivedChange={onCashReceivedChange}
        />
      ) : null}

      {method === "QRIS" && methods.includes("QRIS") ? (
        <QrisPayment total={total} />
      ) : null}

      {method === "Transfer" && methods.includes("Transfer") ? (
        <TransferPayment
          accounts={bankAccounts}
          selectedId={selectedBankId}
          onSelect={onBankChange}
        />
      ) : null}

      {method !== "Cash" && method !== "QRIS" && method !== "Transfer"
        ? creditPanel
        : null}
    </div>
  );
}
