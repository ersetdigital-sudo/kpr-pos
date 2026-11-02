"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { StockItemEditor } from "@/features/produk/components/StockItemEditor";
import { transferStock } from "@/features/produk/data/produk-repository";
import { formatDateLong, formatNumber } from "@/lib/format";
import type {
  Branch,
  Employee,
  StockTransferRecord,
} from "@/lib/store/types";
import type {
  StockProductOption,
  StockRowInput,
} from "@/features/produk/types";

interface TransferPanelProps {
  records: readonly StockTransferRecord[];
  products: readonly StockProductOption[];
  branches: readonly Branch[];
  employees: readonly Employee[];
  branchId: string;
  branchName: string;
  today: string;
  canManage: boolean;
}

export function TransferPanel({
  records,
  products,
  branches,
  employees,
  branchId,
  branchName,
  today,
  canManage,
}: TransferPanelProps) {
  const { showToast } = useToast();
  const destinations = branches.filter((branch) => branch.id !== branchId);
  const [toBranchId, setToBranchId] = useState(destinations[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<StockRowInput[]>([]);
  const [saving, setSaving] = useState(false);

  const branchNameById = (id: string) =>
    branches.find((branch) => branch.id === id)?.name ?? "-";

  async function handleSubmit() {
    if (saving) return;

    const items = rows
      .filter((row) => row.productId && row.quantity > 0)
      .map((row) => ({
        productId: row.productId,
        quantity: Math.round(row.quantity),
      }));

    setSaving(true);

    try {
      await transferStock({ toBranchId, date, note, items });
      showToast("Transfer stok disimpan", "success");
      setRows([]);
      setNote("");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Transfer gagal disimpan",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  const employeeName = (userId: string) =>
    employees.find((employee) => employee.id === userId)?.name ?? "Karyawan";

  const columns: readonly DataTableColumn<StockTransferRecord>[] = [
    {
      id: "date",
      header: "Tanggal",
      cellClassName: "whitespace-nowrap text-ink-soft",
      cell: (record) => formatDateLong(record.date),
    },
    {
      id: "route",
      header: "Rute",
      cellClassName: "text-ink",
      cell: (record) =>
        `${branchNameById(record.fromBranchId)} → ${branchNameById(record.toBranchId)}`,
    },
    {
      id: "items",
      header: "Produk",
      cell: (record) => (
        <div className="flex flex-col gap-0.5">
          {record.items.map((item) => (
            <span key={item.productId} className="text-ink">
              {item.productName}{" "}
              <span className="text-ink-muted">{item.quantity} pcs</span>
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
        formatNumber(
          record.items.reduce((sum, item) => sum + item.quantity, 0),
        ),
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
              Transfer Antar Cabang
            </h2>
            <p className="mt-0.5 mb-0 text-label text-ink-muted">
              Memindahkan stok dari {branchName}. Jumlah tidak boleh melebihi
              stok asal.
            </p>
          </div>

          {destinations.length === 0 ? (
            <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
              Belum ada cabang tujuan lain.
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Cabang tujuan" labelSize="sm">
                  <Select
                    value={toBranchId}
                    onChange={(event) => setToBranchId(event.target.value)}
                  >
                    {destinations.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </Select>
                </Field>
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
                    placeholder="Contoh: penyeimbangan stok"
                  />
                </Field>
              </div>

              <StockItemEditor
                rows={rows}
                options={products}
                onChange={setRows}
                showAvailableStock
              />

              <Button
                variant="primary"
                size="lg"
                className="self-start px-5"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Menyimpan…" : "Simpan Transfer"}
              </Button>
            </>
          )}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3.5 p-[18px]">
        <h2 className="m-0 text-card-title font-bold text-ink">
          Riwayat Transfer
        </h2>

        {records.length === 0 ? (
          <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
            Belum ada transfer stok.
          </div>
        ) : (
          <DataTable
            ariaLabel="Riwayat transfer stok"
            columns={columns}
            rows={records}
            rowKey={(record) => record.id}
            minWidth={820}
            density="roomy"
            headerTone="soft"
          />
        )}
      </Card>
    </div>
  );
}
