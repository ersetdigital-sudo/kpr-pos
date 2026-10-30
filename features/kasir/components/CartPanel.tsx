import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { PaymentSection } from "@/features/kasir/components/PaymentSection";
import { formatRupiah } from "@/lib/format";
import type { CashierData } from "@/features/kasir/types";

interface CartPanelProps {
  data: CashierData;
}

export function CartPanel({ data }: CartPanelProps) {
  const { cart } = data;

  return (
    <aside
      aria-label="Keranjang"
      className="flex min-w-0 flex-[2_1_340px] flex-col rounded-panel border border-line bg-surface"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-[18px]">
        <h2 className="m-0 text-panel-title font-bold text-ink">
          Pesanan Baru
        </h2>
        <span className="text-label text-ink-muted">
          {data.invoiceNumber}
        </span>
      </div>

      <div className="border-b border-line px-5 py-3.5">
        <Field label="Sales yang menangani (untuk bonus)">
          <Select defaultValue={data.salespeople[0]}>
            {data.salespeople.map((salesperson) => (
              <option key={salesperson} value={salesperson}>
                {salesperson}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-col px-5 py-1.5">
        {cart.lines.map((line) => (
          <div
            key={line.product.id}
            className="flex items-center gap-3 border-b border-line-faint py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="text-body font-semibold text-ink">
                {line.product.name}
              </div>
              <div className="text-meta text-ink-muted">
                {formatRupiah(line.product.price)}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`Kurangi ${line.product.name}`}
                className="h-8 w-8 cursor-pointer rounded-control border border-line-strong bg-surface font-sans text-[16px] text-ink"
              >
                -
              </button>
              <span className="min-w-[22px] text-center text-body font-bold text-ink">
                {line.quantity}
              </span>
              <button
                type="button"
                aria-label={`Tambah ${line.product.name}`}
                className="h-8 w-8 cursor-pointer rounded-control border border-line-strong bg-surface font-sans text-[16px] text-ink"
              >
                +
              </button>
            </div>

            <div className="w-[92px] text-right text-body font-bold text-ink">
              {formatRupiah(line.product.price * line.quantity)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 px-5 py-3.5 text-body">
        <div className="flex justify-between">
          <span className="text-ink-muted">Subtotal</span>
          <span className="text-ink">{formatRupiah(cart.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">Diskon</span>
          <span className="text-ink">- {formatRupiah(cart.discount)}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-dashed border-line-strong pt-2">
          <span className="font-bold text-ink">Total</span>
          <span className="text-stat font-extrabold text-ink">
            {formatRupiah(cart.total)}
          </span>
        </div>
      </div>

      <PaymentSection
        total={cart.total}
        bankAccounts={data.bankAccounts}
        cashReceivedDefault={data.cashReceivedDefault}
      />

      <div className="mt-auto flex flex-col gap-2 px-5 pb-5">
        <Button
          variant="primary"
          size="lg"
          className="h-[54px] rounded-card text-card-title"
        >
          Bayar &amp; Cetak Struk
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 rounded-control-lg"
          >
            Simpan Draft
          </Button>
          <Button
            variant="dangerOutline"
            size="lg"
            className="flex-1 rounded-control-lg"
          >
            Batalkan
          </Button>
        </div>
        <p className="mt-1 mb-0 text-center text-meta text-ink-muted">
          Laci kasir terbuka otomatis setelah struk tercetak
        </p>
      </div>
    </aside>
  );
}
