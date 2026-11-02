"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { createSalesOrder } from "@/features/pesanan/data/pesanan-repository";
import { formatRupiah } from "@/lib/format";
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
}

function createRow(productId: string): NewOrderRow {
  return {
    key: `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    productId,
    quantity: 1,
  };
}

export function NewOrderForm({
  branchId,
  branchName,
  productOptions,
  salesOptions,
  defaultSalesId,
  canChooseSales,
}: NewOrderFormProps) {
  const { showToast } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [salesId, setSalesId] = useState(defaultSalesId);
  const [rows, setRows] = useState<NewOrderRow[]>(() =>
    productOptions[0] ? [createRow(productOptions[0].id)] : [],
  );
  const [saving, setSaving] = useState(false);

  const activeSalesId = salesOptions.some((sales) => sales.id === salesId)
    ? salesId
    : defaultSalesId;
  const activeSales = salesOptions.find((sales) => sales.id === activeSalesId);

  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const totalAmount = rows.reduce((sum, row) => {
    const product = productOptions.find(
      (option) => option.id === row.productId,
    );
    return product ? sum + product.price * row.quantity : sum;
  }, 0);

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
        })),
      });

      showToast(`Pesanan ${order.orderNumber} disimpan`, "success");
      setCustomerName("");
      setCustomerPhone("");
      setNote("");
      setRows(
        productOptions[0] ? [createRow(productOptions[0].id)] : [],
      );
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
    <Card className="flex min-w-0 flex-[1_1_380px] flex-col gap-3.5 p-5">
      <div>
        <h2 className="m-0 text-card-title font-bold text-ink">
          Input Pesanan Baru
        </h2>
        <p className="mt-0.5 mb-0 text-label text-ink-muted">
          Cabang {branchName} · atas nama{" "}
          {activeSales?.name ?? "sales belum dipilih"}
        </p>
      </div>

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
                {product ? (
                  <span className="text-right text-meta text-ink-muted">
                    {row.quantity} × {formatRupiah(product.price)} ={" "}
                    {formatRupiah(product.price * row.quantity)}
                  </span>
                ) : null}
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

        <div className="flex items-baseline justify-between border-t border-dashed border-line-strong pt-2.5">
          <span className="text-body text-ink-muted">
            Total · {totalQuantity} pcs
          </span>
          <span className="text-page-title font-extrabold text-ink">
            {formatRupiah(totalAmount)}
          </span>
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
    </Card>
  );
}
