"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { submitOpname } from "@/features/produk/data/produk-repository";
import { formatDateLong, formatNumber } from "@/lib/format";
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
  const [physical, setPhysical] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (saving) return;
    setSaving(true);

    try {
      await submitOpname({ date, note, physical });
      showToast("Stok opname disimpan dan stok disesuaikan", "success");
      setNote("");
      setPhysical({});
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
      cellClassName: "font-semibold text-ink-soft",
      cell: (product) => formatNumber(product.stock),
    },
    {
      id: "physical",
      header: "Stok Fisik",
      align: "right",
      cell: (product) => (
        <Input
          aria-label={`Stok fisik ${product.name}`}
          type="number"
          min={0}
          inputMode="numeric"
          value={physical[product.id] ?? product.stock}
          onChange={(event) => {
            const next = Number(event.target.value);
            setPhysical((current) => ({
              ...current,
              [product.id]: Number.isFinite(next)
                ? Math.max(0, Math.round(next))
                : 0,
            }));
          }}
          className="ml-auto h-[34px] w-[84px] text-right text-label"
        />
      ),
    },
    {
      id: "difference",
      header: "Selisih",
      align: "right",
      cell: (product) => {
        const difference =
          (physical[product.id] ?? product.stock) - product.stock;

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
            {formatNumber(difference)}
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
          {record.items.map((item) => (
            <span key={item.productId} className="text-ink">
              {item.productName}{" "}
              <span
                className={
                  item.difference > 0 ? "text-success-ink" : "text-danger-ink"
                }
              >
                {item.difference > 0 ? "+" : ""}
                {item.difference}
              </span>{" "}
              <span className="text-meta text-ink-muted">
                ({item.systemQuantity} → {item.physicalQuantity})
              </span>
            </span>
          ))}
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
              Masukkan hasil hitung fisik cabang {branchName}. Sistem mencatat
              selisihnya.
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
                minWidth={520}
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
