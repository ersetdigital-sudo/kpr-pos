"use client";

import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Field } from "@/components/ui/Field";
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2.5">
        <Field label="Uang diterima" className="flex-[1_1_140px]">
          <CurrencyInput
            aria-label="Uang diterima"
            aria-invalid={shortfall > 0}
            value={received}
            onValueChange={onReceivedChange}
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
