"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { submitOpname } from "@/features/produk/data/produk-repository";
import { formatDateLong } from "@/lib/format";
import { buildSellingUnits, formatMixedStock } from "@/lib/units";
import type { Employee, StockOpnameRecord } from "@/lib/store/types";
import type { StockProductOption } from "@/features/produk/types";

interface OpnamePanelProps {
  records: readonly StockOpnameRecord[];
  products: readonly StockProductOption[];
  employees: readonly Employee[];
  branchName: string;
  today: string;
  canManage: boolean;
}

interface OpnameDraft {
  quantity: string;
  unitId: string;
}

export function OpnamePanel({
  records,
  products,
  employees,
  branchName,
  today,
  canManage,
}: OpnamePanelProps) {
  const { showToast } = useToast();
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [drafts, setDrafts] = useState<Record<string, OpnameDraft>>({});
  const [saving, setSaving] = useState(false);

  const productById = new Map(products.map((product) => [product.id, product]));

  function updateDraft(productId: string, patch: Partial<OpnameDraft>) {
    setDrafts((current) => ({
      ...current,
      [productId]: {
        quantity: current[productId]?.quantity ?? "",
        unitId: current[productId]?.unitId ?? "",
        ...patch,
      },
    }));
  }

  async function handleSubmit() {
    if (saving) return;

    const physical: Record<string, { quantity: number; unitId: string }> = {};

    for (const [productId, draft] of Object.entries(drafts)) {
      const text = draft.quantity.trim();
      if (!text) continue;

      const quantity = Number(text);
      if (!Number.isFinite(quantity) || quantity < 0) {
        showToast("Stok fisik tidak boleh negatif", "error");
        return;
      }

      physical[productId] = {
        quantity: Math.round(quantity),
        unitId: draft.unitId,
      };
    }

    if (Object.keys(physical).length === 0) {
      showToast("Isi minimal satu stok fisik", "error");
      return;
    }

    setSaving(true);

    try {
      await submitOpname({ date, note, physical });
      showToast("Stok opname disimpan dan stok disesuaikan", "success");
      setNote("");
      setDrafts({});
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Opname gagal disimpan",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  const employeeName = (userId: string) =>
    employees.find((employee) => employee.id === userId)?.name ?? "Karyawan";

  const inputColumns: readonly DataTableColumn<StockProductOption>[] = [
    {
      id: "product",
      header: "Produk",
      cell: (product) => (
        <div>
          <div className="font-semibold text-ink">{product.name}</div>
          <div className="text-meta text-ink-muted">{product.sku}</div>
        </div>
      ),
    },
    {
      id: "system",
      header: "Stok Sistem",
      align: "right",
      cellClassName: "font-semibold text-ink-soft whitespace-nowrap",
      cell: (product) => formatMixedStock(product.stock, product),
    },
    {
      id: "physical",
      header: "Stok Fisik",
      align: "right",
      cell: (product) => {
        const unitOptions = buildSellingUnits({
          baseUnit: product.baseUnit,
          price: 0,
          units: product.units,
        });
        const draft = drafts[product.id];
        const unitId = draft?.unitId ?? "";
        const activeUnit =
          unitOptions.find((unit) => unit.id === unitId) ?? unitOptions[0];
        const rawQuantity =
          draft?.quantity !== undefined
            ? draft.quantity
            : unitId === ""
              ? String(product.stock)
              : "";

        return (
          <div className="flex min-w-[190px] flex-col items-end gap-1.5 sm:flex-row sm:justify-end">
            {unitOptions.length > 1 ? (
              <Select
                aria-label={`Satuan stok fisik ${product.name}`}
                value={unitId}
                onChange={(event) =>
                  updateDraft(product.id, {
                    unitId: event.target.value,
                    quantity:
                      event.target.value === ""
                        ? String(product.stock)
                        : "",
                  })
                }
                className="h-[34px] w-full px-1.5 text-label sm:w-[104px]"
              >
                {unitOptions.map((unit) => (
                  <option key={unit.id || "base"} value={unit.id}>
                    {unit.name}
                    {unit.isBase ? "" : ` (${unit.content})`}
                  </option>
                ))}
              </Select>
            ) : null}
            <Input
              aria-label={`Stok fisik ${product.name}`}
              type="number"
              min={0}
              inputMode="numeric"
              value={rawQuantity}
              placeholder="0"
              onChange={(event) =>
                updateDraft(product.id, { quantity: event.target.value })
              }
              className="ml-auto h-[34px] w-[92px] text-right text-label"
            />
            {activeUnit && !activeUnit.isBase ? (
              <span className="text-meta text-ink-muted">
                {activeUnit.content} {product.baseUnit}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "difference",
      header: "Selisih",
      align: "right",
      cell: (product) => {
        const draft = drafts[product.id];
        const text = draft?.quantity.trim() ?? "";

        if (!text) {
          return <span className="text-ink-muted">—</span>;
        }

        const unitOptions = buildSellingUnits({
          baseUnit: product.baseUnit,
          price: 0,
          units: product.units,
        });
        const activeUnit =
          unitOptions.find((unit) => unit.id === draft.unitId) ??
          unitOptions[0];
        const quantity = Number(text);

        if (!Number.isFinite(quantity)) {
          return <span className="text-ink-muted">—</span>;
        }

        const difference =
          Math.round(quantity) * activeUnit.content - product.stock;

        return (
          <span
            className={
              difference === 0
                ? "text-ink-muted"
                : difference > 0
                  ? "font-bold text-success-ink"
                  : "font-bold text-danger-ink"
            }
          >
            {difference > 0 ? "+" : ""}
            {formatMixedStock(difference, product)}
          </span>
        );
      },
    },
  ];

  const historyColumns: readonly DataTableColumn<StockOpnameRecord>[] = [
    {
      id: "date",
      header: "Tanggal",
      cellClassName: "whitespace-nowrap text-ink-soft",
      cell: (record) => formatDateLong(record.date),
    },
    {
      id: "items",
      header: "Penyesuaian",
      cell: (record) => (
        <div className="flex flex-col gap-0.5">
          {record.items.map((item) => {
            const product = productById.get(item.productId);

            return (
              <span key={item.productId} className="text-ink">
                {item.productName}{" "}
                <span
                  className={
                    item.difference > 0
                      ? "text-success-ink"
                      : "text-danger-ink"
                  }
                >
                  {item.difference > 0 ? "+" : ""}
                  {product
                    ? formatMixedStock(item.difference, product)
                    : `${item.difference} unit`}
                </span>{" "}
                <span className="text-meta text-ink-muted">
                  (
                  {product
                    ? formatMixedStock(item.systemQuantity, product)
                    : item.systemQuantity}{" "}
                  →{" "}
                  {product
                    ? formatMixedStock(item.physicalQuantity, product)
                    : item.physicalQuantity}
                  )
                </span>
              </span>
            );
          })}
        </div>
      ),
    },
    {
      id: "difference",
      header: "Total Selisih",
      align: "right",
      cellClassName: "font-bold text-ink",
      cell: (record) =>
        record.items.reduce((sum, item) => sum + item.difference, 0),
    },
    {
      id: "note",
      header: "Catatan",
      cellClassName: "text-ink-muted",
      cell: (record) => record.note || "—",
    },
    {
      id: "user",
      header: "Dicatat Oleh",
      cellClassName: "text-ink-soft",
      cell: (record) => employeeName(record.userId),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <Card className="flex flex-col gap-3.5 p-5">
          <div>
            <h2 className="m-0 text-card-title font-bold text-ink">
              Stok Opname
            </h2>
            <p className="mt-0.5 mb-0 text-label text-ink-muted">
              Masukkan hasil hitung fisik cabang {branchName}. Pilih satuan bila
              menghitung per kubik/rit; sistem mengonversi ke satuan dasar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tanggal" labelSize="sm">
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
            <Field label="Catatan" labelSize="sm">
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Contoh: opname bulanan"
              />
            </Field>
          </div>

          {products.length === 0 ? (
            <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
              Belum ada produk aktif untuk diopname.
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <DataTable
                ariaLabel="Form stok opname"
                columns={inputColumns}
                rows={products}
                rowKey={(product) => product.id}
                minWidth={640}
                density="roomy"
                headerTone="soft"
              />
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="self-start px-5"
            onClick={handleSubmit}
            disabled={products.length === 0 || saving}
          >
            {saving ? "Menyimpan…" : "Simpan Opname"}
          </Button>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3.5 p-[18px]">
        <h2 className="m-0 text-card-title font-bold text-ink">
          Riwayat Stok Opname
        </h2>

        {records.length === 0 ? (
          <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
            Belum ada opname di cabang ini.
          </div>
        ) : (
          <DataTable
            ariaLabel="Riwayat stok opname"
            columns={historyColumns}
            rows={records}
            rowKey={(record) => record.id}
            minWidth={760}
            density="roomy"
            headerTone="soft"
          />
        )}
      </Card>
    </div>
  );
}
