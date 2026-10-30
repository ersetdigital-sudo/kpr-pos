"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { formatRupiah } from "@/lib/format";

interface CashPaymentProps {
  total: number;
  defaultReceived: number;
}

export function CashPayment({ total, defaultReceived }: CashPaymentProps) {
  const [received, setReceived] = useState(defaultReceived);
  const change = Math.max(received - total, 0);

  function handleReceivedChange(event: ChangeEvent<HTMLInputElement>) {
    // Hanya angka yang disimpan; tampilan tetap diformat sebagai rupiah.
    const digits = event.target.value.replace(/\D/g, "");
    setReceived(digits ? Number(digits) : 0);
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <Field label="Uang diterima" className="flex-[1_1_140px]">
        <Input
          aria-label="Uang diterima"
          inputMode="numeric"
          value={received ? formatRupiah(received) : ""}
          onChange={handleReceivedChange}
          className="text-amount font-bold"
        />
      </Field>

      <div className="flex flex-[1_1_140px] flex-col gap-1.5">
        <span className="text-meta font-semibold text-ink-muted">
          Kembalian
        </span>
        <div
          aria-live="polite"
          className="flex h-[42px] items-center rounded-control bg-success-tint px-[10px] text-amount font-extrabold text-success-ink"
        >
          {formatRupiah(change)}
        </div>
      </div>
    </div>
  );
}
