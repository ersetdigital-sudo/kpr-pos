"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { StockItemEditor } from "@/features/produk/components/StockItemEditor";
import { addStockIn } from "@/features/produk/data/produk-repository";
import { formatDateLong } from "@/lib/format";
import type {
  StockInRecord,
  Employee,
} from "@/lib/store/types";
import type {
  StockProductOption,
  StockRowInput,
} from "@/features/produk/types";

interface StockInPanelProps {
  records: readonly StockInRecord[];
  products: readonly StockProductOption[];
  employees: readonly Employee[];
  branchName: string;
  today: string;
  canManage: boolean;
}

export function StockInPanel({
  records,
  products,
  employees,
  branchName,
  today,
  canManage,
}: StockInPanelProps) {
  const { showToast } = useToast();
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<StockRowInput[]>([]);

  function handleSubmit() {
    const items = rows
      .filter((row) => row.productId && row.quantity > 0)
      .map((row) => ({
        productId: row.productId,
        quantity: Math.round(row.quantity),
      }));

    if (items.length === 0) {
      showToast("Isi minimal satu produk dan jumlahnya", "error");
      return;
    }

    try {
      addStockIn({ date, note, items });
      showToast("Stok masuk disimpan", "success");
      setRows([]);
      setNote("");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Stok masuk gagal disimpan",
        "error",
      );
    }
  }

  const employeeName = (userId: string) =>
    employees.find((employee) => employee.id === userId)?.name ?? "Karyawan";

  const columns: readonly DataTableColumn<StockInRecord>[] = [
    {
      id: "date",
      header: "Tanggal",
      cellClassName: "whitespace-nowrap text-ink-soft",
      cell: (record) => formatDateLong(record.date),
    },
    {
      id: "items",
      header: "Produk",
      cell: (record) => (
        <div className="flex flex-col gap-0.5">
          {record.items.map((item) => (
            <span key={item.productId} className="text-ink">
              {item.productName}{" "}
              <span className="text-ink-muted">+{item.quantity}</span>
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      cellClassName: "font-bold text-ink",
      cell: (record) =>
        record.items.reduce((sum, item) => sum + item.quantity, 0),
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
              Input Stok Masuk
            </h2>
            <p className="mt-0.5 mb-0 text-label text-ink-muted">
              Menambah stok cabang {branchName}.
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
                placeholder="Contoh: restock supplier"
              />
            </Field>
          </div>

          <StockItemEditor
            rows={rows}
            options={products}
            onChange={setRows}
          />

          <Button
            variant="primary"
            size="lg"
            className="self-start px-5"
            onClick={handleSubmit}
          >
            Simpan Stok Masuk
          </Button>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3.5 p-[18px]">
        <h2 className="m-0 text-card-title font-bold text-ink">
          Riwayat Stok Masuk
        </h2>

        {records.length === 0 ? (
          <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
            Belum ada stok masuk di cabang ini.
          </div>
        ) : (
          <DataTable
            ariaLabel="Riwayat stok masuk"
            columns={columns}
            rows={records}
            rowKey={(record) => record.id}
            minWidth={720}
            density="roomy"
            headerTone="soft"
          />
        )}
      </Card>
    </div>
  );
}
