"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { createSalesOrder } from "@/features/pesanan/data/pesanan-repository";
import { SalesChargeFields } from "@/features/sales/components/SalesChargeFields";
import { formatPercent, formatRupiah } from "@/lib/format";
import { calculateSalesCharges } from "@/lib/store/charges";
import type {
  DiscountType,
  PriceType,
  ShippingMethod,
} from "@/lib/store/types";
import type {
  NewOrderRow,
  OrderProductOption,
  SalesEmployeeOption,
} from "@/features/pesanan/types";

interface NewOrderFormProps {
  branchId: string;
  branchName: string;
  productOptions: readonly OrderProductOption[];
  salesOptions: readonly SalesEmployeeOption[];
  defaultSalesId: string;
  canChooseSales: boolean;
  /** Tarif PPN default dari pengaturan; disalin saat pesanan dibuat. */
  taxRate: number;
  /** Dipanggil setelah pesanan tersimpan, mis. untuk menutup dialog. */
  onSaved?: () => void;
}

function createRow(productId: string): NewOrderRow {
  return {
    key: `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    productId,
    quantity: 1,
    priceType: "retail",
    discountType: "nominal",
    discountValue: 0,
  };
}

function getRowPricing(
  row: NewOrderRow,
  product: OrderProductOption | undefined,
): { unitPrice: number; gross: number; discount: number; total: number } {
  if (!product) return { unitPrice: 0, gross: 0, discount: 0, total: 0 };

  const unitPrice =
    row.priceType === "wholesale" && product.wholesalePrice > 0
      ? product.wholesalePrice
      : product.price;
  const gross = unitPrice * row.quantity;
  const discount =
    row.discountType === "percent"
      ? Math.min(
          gross,
          Math.round((gross * Math.min(100, row.discountValue)) / 100),
        )
      : Math.min(
          gross,
          Math.max(0, Math.round(row.discountValue)) *
            Math.max(0, Math.round(row.quantity)),
        );

  return { unitPrice, gross, discount, total: gross - discount };
}

export function NewOrderForm({
  branchId,
  branchName,
  productOptions,
  salesOptions,
  defaultSalesId,
  canChooseSales,
  taxRate,
  onSaved,
}: NewOrderFormProps) {
  const { showToast } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [salesId, setSalesId] = useState(defaultSalesId);
  const [rows, setRows] = useState<NewOrderRow[]>(() =>
    productOptions[0] ? [createRow(productOptions[0].id)] : [],
  );
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | "">("");
  const [shippingCost, setShippingCost] = useState(0);
  const [saving, setSaving] = useState(false);

  const activeSalesId = salesOptions.some((sales) => sales.id === salesId)
    ? salesId
    : defaultSalesId;
  const activeSales = salesOptions.find((sales) => sales.id === activeSalesId);

  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const subtotalAmount = rows.reduce((sum, row) => {
    const product = productOptions.find(
      (option) => option.id === row.productId,
    );
    return sum + getRowPricing(row, product).gross;
  }, 0);
  const totalAmount = rows.reduce((sum, row) => {
    const product = productOptions.find(
      (option) => option.id === row.productId,
    );
    return sum + getRowPricing(row, product).total;
  }, 0);
  const discountAmount = subtotalAmount - totalAmount;
  const charges = calculateSalesCharges({
    subtotal: subtotalAmount,
    discountAmount,
    taxEnabled,
    taxRate,
    shippingMethod,
    shippingCost,
  });

  function updateRow(key: string, patch: Partial<NewOrderRow>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!customerName.trim()) {
      showToast("Nama pelanggan wajib diisi", "error");
      return;
    }
    if (rows.length === 0) {
      showToast("Tambahkan minimal satu produk", "error");
      return;
    }
    if (!activeSalesId) {
      showToast("Sales belum dipilih", "error");
      return;
    }
    if (!shippingMethod) {
      showToast("Pilih pengiriman dulu (ambil di toko, ongkir, atau gratis)", "error");
      return;
    }
    if (shippingMethod === "paid" && shippingCost <= 0) {
      showToast("Nominal ongkir harus lebih dari 0", "error");
      return;
    }

    setSaving(true);

    try {
      const order = await createSalesOrder({
        customerName,
        customerPhone,
        note,
        branchId,
        salesEmployeeId: activeSalesId,
        items: rows.map((row) => ({
          productId: row.productId,
          quantity: row.quantity,
          priceType: row.priceType,
          discountType: row.discountType,
          discountValue: row.discountValue,
        })),
        taxEnabled,
        taxRate,
        shippingMethod,
        shippingCost,
      });

      showToast(`Pesanan ${order.orderNumber} disimpan`, "success");
      setCustomerName("");
      setCustomerPhone("");
      setNote("");
      setRows(
        productOptions[0] ? [createRow(productOptions[0].id)] : [],
      );
      setTaxEnabled(false);
      setShippingMethod("");
      setShippingCost(0);
      onSaved?.();
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Pesanan gagal disimpan",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="m-0 text-label text-ink-muted">
        Cabang {branchName} · atas nama{" "}
        {activeSales?.name ?? "sales belum dipilih"}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Field label="Nama pelanggan" labelSize="sm">
          <Input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Contoh: Bu Sari"
            className="px-3"
          />
        </Field>

        <Field label="No. WhatsApp" labelSize="sm">
          <Input
            type="tel"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            placeholder="08xx"
            className="px-3"
          />
        </Field>

        {canChooseSales ? (
          <Field label="Sales" labelSize="sm">
            <Select
              value={activeSalesId}
              onChange={(event) => setSalesId(event.target.value)}
            >
              {salesOptions.length === 0 ? (
                <option value="">Belum ada sales di cabang ini</option>
              ) : null}
              {salesOptions.map((sales) => (
                <option key={sales.id} value={sales.id}>
                  {sales.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="text-label font-semibold text-ink-soft">Produk</div>

          {rows.length === 0 ? (
            <p className="m-0 rounded-control border border-dashed border-line-strong px-3 py-2.5 text-meta text-ink-muted">
              Belum ada produk aktif.
            </p>
          ) : null}

          {rows.map((row, index) => {
            const product = productOptions.find(
              (option) => option.id === row.productId,
            );
            const pricing = getRowPricing(row, product);

            return (
              <div key={row.key} className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <Select
                    aria-label={`Produk ${index + 1}`}
                    value={row.productId}
                    onChange={(event) =>
                      updateRow(row.key, { productId: event.target.value })
                    }
                    className="min-w-0 flex-1"
                  >
                    {productOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} · {formatRupiah(option.price)}
                      </option>
                    ))}
                  </Select>
                  <Input
                    aria-label={`Jumlah produk ${index + 1}`}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={row.quantity === 0 ? "" : row.quantity}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      updateRow(row.key, {
                        quantity: Number.isFinite(next)
                          ? Math.max(0, Math.round(next))
                          : 0,
                      });
                    }}
                    className="w-[72px] px-[10px]"
                  />
                  <Button
                    variant="dangerOutline"
                    size="md"
                    className="px-2.5"
                    onClick={() =>
                      setRows((current) =>
                        current.filter((item) => item.key !== row.key),
                      )
                    }
                    aria-label="Hapus baris produk"
                  >
                    ×
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    aria-label={`Jenis harga ${index + 1}`}
                    value={row.priceType}
                    onChange={(event) =>
                      updateRow(row.key, {
                        priceType: event.target.value as PriceType,
                      })
                    }
                    className="h-8 cursor-pointer rounded-control border border-line-strong bg-surface px-1.5 font-sans text-meta text-ink"
                  >
                    <option value="retail">Ecer</option>
                    <option
                      value="wholesale"
                      disabled={!product || product.wholesalePrice <= 0}
                    >
                      Grosir
                    </option>
                  </select>

                  <select
                    aria-label={`Tipe diskon ${index + 1}`}
                    value={row.discountType}
                    onChange={(event) =>
                      updateRow(row.key, {
                        discountType: event.target.value as DiscountType,
                        discountValue: 0,
                      })
                    }
                    className="h-8 cursor-pointer rounded-control border border-line-strong bg-surface px-1.5 font-sans text-meta text-ink"
                  >
                    <option value="nominal">Rp/pcs</option>
                    <option value="percent">%</option>
                  </select>

                  <input
                    aria-label={`Diskon ${index + 1}`}
                    type="number"
                    min={0}
                    max={row.discountType === "percent" ? 100 : undefined}
                    value={row.discountValue === 0 ? "" : row.discountValue}
                    placeholder="0"
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      const safeValue = Number.isFinite(next)
                        ? Math.max(0, next)
                        : 0;
                      updateRow(row.key, {
                        discountValue:
                          row.discountType === "percent"
                            ? Math.min(100, safeValue)
                            : Math.round(safeValue),
                      });
                    }}
                    className="h-8 w-[80px] rounded-control border border-line-strong bg-surface px-2 text-right font-sans text-meta text-ink"
                  />

                  <span className="ml-auto text-right text-meta text-ink-muted">
                    {row.quantity} × {formatRupiah(pricing.unitPrice)}
                    {pricing.discount > 0
                      ? ` · diskon ${formatRupiah(pricing.discount)}`
                      : ""}{" "}
                    = {formatRupiah(pricing.total)}
                  </span>
                </div>
              </div>
            );
          })}

          <Button
            variant="dashed"
            size="md"
            className="self-start px-3 text-label"
            onClick={() =>
              setRows((current) => [
                ...current,
                createRow(
                  productOptions.find(
                    (option) =>
                      !current.some((row) => row.productId === option.id),
                  )?.id ??
                    productOptions[0]?.id ??
                    "",
                ),
              ])
            }
            disabled={productOptions.length === 0}
          >
            + Tambah produk
          </Button>
        </div>

        <Field label="Catatan" labelSize="sm">
          <Textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Opsional"
          />
        </Field>

        <div className="rounded-control border border-line px-3 py-3">
          <SalesChargeFields
            taxEnabled={taxEnabled}
            taxRate={taxRate}
            taxAmount={charges.taxAmount}
            onTaxEnabledChange={setTaxEnabled}
            shippingMethod={shippingMethod}
            shippingCost={shippingCost}
            shippingAmount={charges.shippingCost}
            onShippingMethodChange={setShippingMethod}
            onShippingCostChange={setShippingCost}
          />
        </div>

        <div className="flex flex-col gap-1.5 border-t border-dashed border-line-strong pt-2.5 text-label">
          <div className="flex justify-between">
            <span className="text-ink-muted">Subtotal</span>
            <span className="text-ink">{formatRupiah(subtotalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Diskon</span>
            <span className="text-ink">- {formatRupiah(discountAmount)}</span>
          </div>
          {taxEnabled ? (
            <div className="flex justify-between">
              <span className="text-ink-muted">
                PPN {formatPercent(taxRate)}
              </span>
              <span className="text-ink">{formatRupiah(charges.taxAmount)}</span>
            </div>
          ) : null}
          {shippingMethod === "paid" ? (
            <div className="flex justify-between">
              <span className="text-ink-muted">Ongkir</span>
              <span className="text-ink">
                {formatRupiah(charges.shippingCost)}
              </span>
            </div>
          ) : null}
          {shippingMethod === "free" ? (
            <div className="flex justify-between">
              <span className="text-ink-muted">Ongkir</span>
              <span className="font-semibold text-success-ink">
                Gratis ongkir
              </span>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between border-t border-dashed border-line-strong pt-2">
            <span className="text-body text-ink-muted">
              Total bayar · {totalQuantity} pcs
            </span>
            <span className="text-page-title font-extrabold text-ink">
              {formatRupiah(charges.total)}
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          type="submit"
          className="h-[50px] rounded-card text-amount"
          disabled={productOptions.length === 0 || saving}
        >
          {saving ? "Menyimpan…" : "Simpan Pesanan"}
        </Button>
      </form>

      <p className="m-0 text-meta text-ink-muted">
        Pesanan berstatus menunggu bayar; stok berkurang saat ditandai lunas.
      </p>
    </div>
  );
}
