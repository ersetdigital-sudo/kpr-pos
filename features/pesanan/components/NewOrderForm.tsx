import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatRupiah } from "@/lib/format";
import type {
  OrderDraft,
  OrderProductOption,
} from "@/features/pesanan/types";

interface NewOrderFormProps {
  productOptions: readonly OrderProductOption[];
  draft: OrderDraft;
}

export function NewOrderForm({ productOptions, draft }: NewOrderFormProps) {
  return (
    <Card className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 p-5">
      <h2 className="m-0 text-card-title font-bold text-ink">
        Input Pesanan Baru
      </h2>

      <Field label="Nama pelanggan" labelSize="sm">
        <Input placeholder="Contoh: Bu Sari" className="px-3" />
      </Field>

      <Field label="No. WhatsApp" labelSize="sm">
        <Input type="tel" placeholder="08xx" className="px-3" />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="text-label font-semibold text-ink-soft">Produk</div>

        {draft.items.map((item, index) => (
          <div key={item.productId} className="flex gap-2">
            <Select
              aria-label={`Produk ${index + 1}`}
              defaultValue={item.productId}
              className="min-w-0 flex-1"
            >
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {formatRupiah(product.price)}
                </option>
              ))}
            </Select>
            <Input
              aria-label={`Jumlah produk ${index + 1}`}
              type="number"
              min={1}
              defaultValue={item.quantity}
              className="w-[72px] px-[10px]"
            />
          </div>
        ))}

        <Button
          variant="dashed"
          size="md"
          className="self-start px-3 text-label"
        >
          + Tambah produk
        </Button>
      </div>

      <Field label="Catatan" labelSize="sm">
        <Textarea rows={2} placeholder="Opsional" />
      </Field>

      <div className="flex items-baseline justify-between border-t border-dashed border-line-strong pt-2.5">
        <span className="text-body text-ink-muted">
          Total · {draft.totalQuantity} pcs
        </span>
        <span className="text-page-title font-extrabold text-ink">
          {formatRupiah(draft.totalAmount)}
        </span>
      </div>

      <Button
        variant="primary"
        className="h-[50px] rounded-card text-amount"
      >
        Simpan Pesanan
      </Button>

      <p className="m-0 text-meta text-ink-muted">
        Tetap bisa disimpan saat offline, otomatis terkirim saat internet
        tersambung.
      </p>
    </Card>
  );
}
