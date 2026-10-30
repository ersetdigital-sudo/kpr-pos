"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  downloadProductTemplate,
  parseProductFile,
  toImportPayload,
} from "@/features/produk/data/produk-excel";
import { importProducts } from "@/features/produk/data/produk-repository";
import { formatRupiah } from "@/lib/format";
import type { AppDatabase } from "@/lib/store/types";
import type { ImportProductRow } from "@/features/produk/types";

interface ImportProductsModalProps {
  open: boolean;
  database: AppDatabase;
  branchName: string;
  onClose: () => void;
}

const columns: readonly DataTableColumn<ImportProductRow>[] = [
  {
    id: "row",
    header: "Baris",
    cell: (row) => row.rowNumber,
  },
  {
    id: "product",
    header: "Produk",
    cell: (row) => (
      <div>
        <div className="font-semibold text-ink">{row.name || "—"}</div>
        <div className="text-meta text-ink-muted">{row.sku || "—"}</div>
      </div>
    ),
  },
  {
    id: "category",
    header: "Kategori",
    cell: (row) => row.categoryName || "—",
  },
  {
    id: "price",
    header: "Harga Jual",
    align: "right",
    cell: (row) => formatRupiah(row.price),
  },
  {
    id: "stock",
    header: "Stok",
    align: "right",
    cell: (row) => row.stock,
  },
  {
    id: "status",
    header: "Status",
    cell: (row) =>
      row.errors.length === 0 ? (
        <StatusBadge tone="success">Valid</StatusBadge>
      ) : (
        <div className="flex flex-col gap-0.5">
          <StatusBadge tone="danger">Error</StatusBadge>
          <span className="max-w-[220px] whitespace-normal text-meta text-danger-ink">
            {row.errors.join(" · ")}
          </span>
        </div>
      ),
  },
];

export function ImportProductsModal({
  open,
  database,
  branchName,
  onClose,
}: ImportProductsModalProps) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ImportProductRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validRows = rows.filter((row) => row.errors.length === 0);

  function reset() {
    setRows([]);
    setFileName("");
    setError("");
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setFileName(file.name);

    try {
      const parsed = await parseProductFile(file, database);
      setRows(parsed);
      if (parsed.length === 0) {
        setError("Tidak ada baris produk yang bisa dibaca");
      }
    } catch (caught) {
      setRows([]);
      setError(
        caught instanceof Error ? caught.message : "File gagal dibaca",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      await downloadProductTemplate(database.categories);
      showToast("Template Excel diunduh", "success");
    } catch {
      showToast("Template gagal diunduh", "error");
    }
  }

  function handleImport() {
    if (validRows.length === 0) {
      showToast("Tidak ada baris valid untuk diimpor", "error");
      return;
    }

    try {
      const count = importProducts(validRows.map(toImportPayload));
      showToast(`${count} produk berhasil diimpor`, "success");
      handleClose();
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Import gagal",
        "error",
      );
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Produk dari Excel"
      description={`Stok awal masuk ke ${branchName}. Unduh template agar kolom sesuai.`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            Download Template
          </Button>
          <Button variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={validRows.length === 0}
          >
            Import {validRows.length} Produk
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex h-10 cursor-pointer items-center rounded-control border border-line-strong bg-surface px-3.5 text-body font-semibold text-ink">
            Pilih File Excel
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="sr-only"
            />
          </label>
          <span className="text-label text-ink-muted">
            {fileName || "Belum ada file dipilih"}
          </span>
          {loading ? (
            <span className="text-label font-semibold text-brand">
              Membaca file…
            </span>
          ) : null}
        </div>

        <div className="rounded-control bg-canvas px-3.5 py-3 text-meta text-ink-muted">
          Kolom: Nama Produk, SKU, Kategori, Harga Modal, Harga Jual, Stok
          Awal, Stok Minimum. Kategori harus sudah ada; SKU harus unik.
        </div>

        {error ? (
          <p className="m-0 rounded-control bg-danger-soft px-3 py-2 text-label font-semibold text-danger-ink">
            {error}
          </p>
        ) : null}

        {rows.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-label">
              <StatusBadge tone="success">
                {validRows.length} valid
              </StatusBadge>
              <StatusBadge tone="danger">
                {rows.length - validRows.length} error
              </StatusBadge>
              <span className="text-ink-muted">
                Baris error tidak ikut diimpor.
              </span>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              <DataTable
                ariaLabel="Preview import produk"
                columns={columns}
                rows={rows}
                rowKey={(row) => `${row.rowNumber}-${row.sku}`}
                minWidth={720}
                density="roomy"
                headerTone="soft"
              />
            </div>
          </>
        ) : (
          <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center">
            <p className="m-0 text-body font-semibold text-ink">
              Belum ada preview
            </p>
            <p className="mt-1 mb-0 text-meta text-ink-muted">
              Pilih file Excel untuk melihat validasi per baris.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
