"use client";

import type { ChangeEvent } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { calculateChange } from "@/features/kasir/data/kasir-calculations";
import { formatRupiah } from "@/lib/format";

interface CashPaymentProps {
  total: number;
  received: number;
  onReceivedChange: (value: number) => void;
}

export function CashPayment({
  total,
  received,
  onReceivedChange,
}: CashPaymentProps) {
  const change = calculateChange(total, received);
  const shortfall = Math.max(0, total - received);

  function handleReceivedChange(event: ChangeEvent<HTMLInputElement>) {
    // Hanya angka yang disimpan; tampilan tetap diformat sebagai rupiah.
    const digits = event.target.value.replace(/\D/g, "");
    onReceivedChange(digits ? Number(digits) : 0);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2.5">
        <Field label="Uang diterima" className="flex-[1_1_140px]">
          <Input
            aria-label="Uang diterima"
            aria-invalid={shortfall > 0}
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

      {shortfall > 0 ? (
        <p className="m-0 text-meta font-semibold text-danger-ink">
          Uang kurang {formatRupiah(shortfall)}
        </p>
      ) : null}
    </div>
  );
}
