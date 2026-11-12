"use client";

import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import type { Customer } from "@/lib/store/types";

interface CreditPaymentPanelProps {
  method: "COD" | "Tempo";
  customers: readonly Customer[];
  customerId: string;
  onCustomerChange: (customerId: string) => void;
  tempoDays: number;
  tenorOptions: readonly number[];
  onTempoDaysChange: (days: number) => void;
  /** Pelanggan terpilih masih punya tempo aktif. */
  tempoBlocked: boolean;
}

/**
 * Panel COD/Tempo di kasir. Hanya muncul saat pesanan sales sudah dimuat,
 * karena metode ini selalu terkait pesanan.
 */
export function CreditPaymentPanel({
  method,
  customers,
  customerId,
  onCustomerChange,
  tempoDays,
  tenorOptions,
  onTempoDaysChange,
  tempoBlocked,
}: CreditPaymentPanelProps) {
  if (method === "COD") {
    return (
      <div className="rounded-control border border-line bg-info-soft px-3 py-2.5 text-meta text-info-ink">
        Pesanan diproses sebagai COD. Stok langsung berkurang dan status
        menjadi <strong>COD - menunggu pembayaran</strong>. Pemasukan masuk Buku
        Kas saat kasir menandai lunas.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-control border border-line bg-warning-soft px-3 py-3">
      <Field label="Pelanggan boleh tempo" labelSize="xs">
        <Select
          value={customerId}
          onChange={(event) => onCustomerChange(event.target.value)}
          className="h-[38px] bg-surface text-label"
        >
          <option value="">Pilih pelanggan…</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
              {customer.phone ? ` · ${customer.phone}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      {customers.length === 0 ? (
        <p className="m-0 text-meta text-warning-ink">
          Belum ada pelanggan yang ditandai boleh tempo. Minta Owner/Manager
          menandainya di menu Pelanggan.
        </p>
      ) : null}

      <Field label="Tenor tempo" labelSize="xs">
        <div className="flex flex-wrap gap-1.5">
          {tenorOptions.map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={tempoDays === days}
              onClick={() => onTempoDaysChange(days)}
              className={
                tempoDays === days
                  ? "h-9 cursor-pointer rounded-control border-2 border-brand bg-surface px-3 font-sans text-label font-bold text-brand"
                  : "h-9 cursor-pointer rounded-control border border-line-strong bg-surface px-3 font-sans text-label font-semibold text-ink"
              }
            >
              {days} hari
            </button>
          ))}
        </div>
      </Field>

      {tempoBlocked ? (
        <p className="m-0 text-meta font-semibold text-danger-ink">
          Pelanggan ini masih punya tempo aktif yang belum lunas. Selesaikan
          tempo tersebut dulu sebelum memberi tempo baru.
        </p>
      ) : (
        <p className="m-0 text-meta text-warning-ink">
          Stok berkurang sekarang; jatuh tempo dihitung dari hari ini. Hanya
          satu tempo aktif per pelanggan.
        </p>
      )}
    </div>
  );
}
