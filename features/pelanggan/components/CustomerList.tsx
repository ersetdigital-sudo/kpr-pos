"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatDateTimeShort,
  formatNumber,
  formatRupiah,
} from "@/lib/format";
import type { CustomerRecapRow } from "@/features/pelanggan/types";

export type CustomerSort = "name" | "spending";

interface CustomerListProps {
  rows: readonly CustomerRecapRow[];
  totalCount: number;
  search: string;
  sort: CustomerSort;
  canManageData: boolean;
  onSearchChange: (value: string) => void;
  onSortChange: (value: CustomerSort) => void;
  onAdd: () => void;
  onEdit: (row: CustomerRecapRow) => void;
  onOpenDetail: (row: CustomerRecapRow) => void;
  onMerge: (row: CustomerRecapRow) => void;
  onDeactivate: (row: CustomerRecapRow) => void;
  onDelete: (row: CustomerRecapRow) => void;
}

/** Daftar pelanggan + rekap belanja; baris lega, aksi menyesuaikan izin. */
export function CustomerList({
  rows,
  totalCount,
  search,
  sort,
  canManageData,
  onSearchChange,
  onSortChange,
  onAdd,
  onEdit,
  onOpenDetail,
  onMerge,
  onDeactivate,
  onDelete,
}: CustomerListProps) {
  return (
    <Card className="flex min-w-0 flex-col p-5">
      <CardHeader
        title="Data Pelanggan"
        subtitle="Klik nama pelanggan untuk melihat riwayat belanja."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchField
              label="Cari pelanggan"
              placeholder="Cari nama atau no. HP…"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full sm:w-[220px]"
            />
            <Select
              aria-label="Urutkan pelanggan"
              value={sort}
              onChange={(event) =>
                onSortChange(event.target.value as CustomerSort)
              }
              className="h-10 w-auto px-2.5"
            >
              <option value="spending">Total belanja terbesar</option>
              <option value="name">Nama A–Z</option>
            </Select>
            <Button variant="primary" size="sm" onClick={onAdd}>
              Tambah pelanggan
            </Button>
          </div>
        }
        className="mb-4"
      />

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-10 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            {totalCount === 0
              ? "Belum ada pelanggan"
              : "Tidak ada pelanggan yang cocok"}
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            {totalCount === 0
              ? "Tambahkan pelanggan agar bisa memakai pembayaran tempo."
              : "Coba kata kunci atau periode lain."}
          </p>
        </div>
      ) : (
        <ul
          aria-label="Data pelanggan"
          className="divide-y divide-line-faint rounded-control border border-line"
        >
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-line-subtle lg:flex-row lg:items-center lg:justify-between lg:gap-4"
            >
              <button
                type="button"
                onClick={() => onOpenDetail(row)}
                className="min-w-0 flex-1 cursor-pointer rounded-control border-0 bg-transparent p-0 text-left font-sans focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-body font-semibold text-ink">
                    {row.name}
                  </span>
                  {row.allowTempo ? (
                    <StatusBadge tone="brand">Boleh tempo</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">Tunai</StatusBadge>
                  )}
                  {row.activeTempo ? (
                    <StatusBadge tone="warning">Tempo aktif</StatusBadge>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-meta text-ink-muted">
                  {row.phone || "Tanpa no. HP"}
                  {row.activeCreditCount > 0
                    ? ` · ${formatNumber(row.activeCreditCount)} tagihan berjalan`
                    : ""}
                </span>
                <span className="mt-1 block text-label text-ink-soft">
                  {row.transactionCount > 0
                    ? `${formatNumber(row.transactionCount)} transaksi · ${formatRupiah(row.totalSpending)} · terakhir ${
                        row.lastPurchaseAt
                          ? formatDateTimeShort(row.lastPurchaseAt)
                          : "—"
                      }`
                    : "Belum ada belanja pada periode ini"}
                </span>
                {row.historyCount > 0 ? (
                  <span className="mt-1 block text-meta text-ink-muted">
                    Hapus nonaktif: sudah ada{" "}
                    {formatNumber(row.historyCount)} riwayat. Pakai Gabungkan
                    atau Nonaktifkan.
                  </span>
                ) : null}
              </button>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[32px] px-2.5 text-meta"
                  onClick={() => onEdit(row)}
                >
                  Ubah
                </Button>

                {canManageData ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-[32px] px-2.5 text-meta"
                      onClick={() => onMerge(row)}
                      disabled={totalCount < 2}
                      title={
                        totalCount < 2
                          ? "Butuh minimal dua pelanggan untuk menggabungkan"
                          : undefined
                      }
                    >
                      Gabungkan
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-[32px] px-2.5 text-meta"
                      onClick={() => onDeactivate(row)}
                    >
                      Nonaktifkan
                    </Button>
                    <Button
                      variant="dangerOutline"
                      size="sm"
                      className="h-[32px] px-2.5 text-meta"
                      onClick={() => onDelete(row)}
                      disabled={row.historyCount > 0}
                      title={
                        row.historyCount > 0
                          ? "Pelanggan sudah punya riwayat. Gabungkan atau nonaktifkan."
                          : "Hapus pelanggan tanpa riwayat"
                      }
                    >
                      Hapus
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
