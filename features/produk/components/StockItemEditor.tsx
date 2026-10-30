"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type {
  StockProductOption,
  StockRowInput,
} from "@/features/produk/types";

interface StockItemEditorProps {
  rows: readonly StockRowInput[];
  options: readonly StockProductOption[];
  onChange: (rows: StockRowInput[]) => void;
  showAvailableStock?: boolean;
}

export function StockItemEditor({
  rows,
  options,
  onChange,
  showAvailableStock = false,
}: StockItemEditorProps) {
  function updateRow(key: string, patch: Partial<StockRowInput>) {
    onChange(
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    onChange([
      ...rows,
      {
        key: `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        productId: options[0]?.id ?? "",
        quantity: 1,
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 ? (
        <p className="m-0 rounded-control border border-dashed border-line-strong px-3 py-2.5 text-meta text-ink-muted">
          Belum ada produk dipilih.
        </p>
      ) : null}

      {rows.map((row) => {
        const selected = options.find((option) => option.id === row.productId);

        return (
          <div key={row.key} className="flex flex-wrap items-start gap-2">
            <Select
              aria-label="Pilih produk"
              value={row.productId}
              onChange={(event) =>
                updateRow(row.key, { productId: event.target.value })
              }
              className="min-w-0 flex-[1_1_220px]"
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {showAvailableStock ? ` · sisa ${option.stock}` : ""}
                </option>
              ))}
            </Select>
            <Input
              aria-label="Jumlah"
              type="number"
              min={1}
              inputMode="numeric"
              value={row.quantity === 0 ? "" : row.quantity}
              onChange={(event) => {
                const next = Number(event.target.value);
                updateRow(row.key, {
                  quantity: Number.isFinite(next) ? Math.max(0, next) : 0,
                });
              }}
              className="w-[92px]"
            />
            {showAvailableStock && selected ? (
              <span className="flex h-[42px] items-center text-meta text-ink-muted">
                Sisa {selected.stock} pcs
              </span>
            ) : null}
            <Button
              variant="dangerOutline"
              size="md"
              className="px-3"
              onClick={() =>
                onChange(rows.filter((item) => item.key !== row.key))
              }
              aria-label="Hapus baris produk"
            >
              Hapus
            </Button>
          </div>
        );
      })}

      <Button
        variant="dashed"
        size="md"
        className="self-start px-3 text-label"
        onClick={addRow}
        disabled={options.length === 0}
      >
        + Tambah produk
      </Button>
    </div>
  );
}
