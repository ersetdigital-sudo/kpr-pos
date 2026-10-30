"use client";

import { useState } from "react";
import { CashPayment } from "@/features/kasir/components/CashPayment";
import { QrisPayment } from "@/features/kasir/components/QrisPayment";
import { TransferPayment } from "@/features/kasir/components/TransferPayment";
import { cn } from "@/lib/cn";
import type { BankAccount } from "@/features/kasir/types";
import type { PaymentMethod } from "@/types";

const PAYMENT_METHODS: readonly PaymentMethod[] = ["Cash", "QRIS", "Transfer"];

interface PaymentSectionProps {
  total: number;
  bankAccounts: readonly BankAccount[];
  cashReceivedDefault: number;
}

export function PaymentSection({
  total,
  bankAccounts,
  cashReceivedDefault,
}: PaymentSectionProps) {
  const [method, setMethod] = useState<PaymentMethod>("Cash");

  return (
    <div className="flex flex-col gap-[10px] px-5 pb-3.5">
      <div className="text-meta font-semibold text-ink-muted">
        Metode pembayaran
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PAYMENT_METHODS.map((option) => {
          const active = option === method;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => setMethod(option)}
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

      {method === "Cash" ? (
        <CashPayment total={total} defaultReceived={cashReceivedDefault} />
      ) : null}

      {method === "QRIS" ? <QrisPayment total={total} /> : null}

      {method === "Transfer" ? (
        <TransferPayment accounts={bankAccounts} />
      ) : null}
    </div>
  );
}
