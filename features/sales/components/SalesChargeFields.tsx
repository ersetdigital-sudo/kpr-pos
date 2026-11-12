"use client";

import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { cn } from "@/lib/cn";
import { formatPercent, formatRupiah } from "@/lib/format";
import type { ShippingMethod } from "@/lib/store/types";

const SHIPPING_OPTIONS: readonly {
  id: ShippingMethod;
  label: string;
  hint: string;
}[] = [
  { id: "pickup", label: "Ambil di toko", hint: "Tanpa ongkir" },
  { id: "paid", label: "Isi ongkir", hint: "Dibayar pelanggan" },
  { id: "free", label: "Gratis ongkir", hint: "Ditanggung toko" },
];

interface SalesChargeFieldsProps {
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  onTaxEnabledChange: (enabled: boolean) => void;
  shippingMethod: ShippingMethod | "";
  shippingCost: number;
  shippingAmount: number;
  onShippingMethodChange: (method: ShippingMethod) => void;
  onShippingCostChange: (value: number) => void;
}

/** Pilihan PPN dan pengiriman bersama untuk Kasir dan Pesanan Sales. */
export function SalesChargeFields({
  taxEnabled,
  taxRate,
  taxAmount,
  onTaxEnabledChange,
  shippingMethod,
  shippingCost,
  shippingAmount,
  onShippingMethodChange,
  onShippingCostChange,
}: SalesChargeFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-meta font-semibold text-ink-muted">PPN</span>
          <span className="text-meta text-ink-muted">
            Tarif {formatPercent(taxRate)}
          </span>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-control border border-line-strong bg-surface px-3 py-2.5">
          <span className="text-label font-semibold text-ink">
            Pakai PPN
          </span>
          <span className="flex items-center gap-2">
            {taxEnabled ? (
              <span className="text-label font-semibold text-brand">
                {formatRupiah(taxAmount)}
              </span>
            ) : null}
            <input
              type="checkbox"
              checked={taxEnabled}
              onChange={(event) => onTaxEnabledChange(event.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[var(--color-brand)]"
            />
          </span>
        </label>
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-meta font-semibold text-ink-muted">
          Pengiriman
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {SHIPPING_OPTIONS.map((option) => {
            const active = shippingMethod === option.id;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onShippingMethodChange(option.id)}
                className={cn(
                  "flex min-h-[54px] cursor-pointer flex-col items-center justify-center rounded-control border px-1.5 py-2 text-center font-sans",
                  active
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line-strong bg-surface text-ink-muted hover:bg-line-subtle",
                )}
              >
                <span className="text-meta font-semibold leading-tight">
                  {option.label}
                </span>
                <span className="text-[10px] leading-tight">{option.hint}</span>
              </button>
            );
          })}
        </div>

        {shippingMethod === "" ? (
          <p className="m-0 text-meta font-semibold text-warning-ink">
            Pilih pengiriman agar ongkir tidak terlewat.
          </p>
        ) : null}

        {shippingMethod === "paid" ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-label font-semibold text-ink-soft">
              Nominal ongkir
            </span>
            <CurrencyInput
              aria-label="Nominal ongkir"
              prefix={false}
              value={shippingCost}
              onValueChange={onShippingCostChange}
              placeholder="0"
              className="h-9 w-[130px] text-label font-semibold"
            />
          </div>
        ) : null}

        {shippingMethod === "free" ? (
          <p className="m-0 rounded-control bg-success-soft px-3 py-2 text-meta font-semibold text-success-ink">
            Gratis ongkir · biaya kirim ditanggung toko.
          </p>
        ) : null}

        {shippingMethod === "paid" && shippingAmount <= 0 ? (
          <p className="m-0 text-meta font-semibold text-warning-ink">
            Isi nominal ongkir lebih dari 0.
          </p>
        ) : null}
      </section>
    </div>
  );
}
