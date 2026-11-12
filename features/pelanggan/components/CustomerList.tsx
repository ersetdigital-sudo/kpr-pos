"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SearchField } from "@/components/ui/SearchField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber } from "@/lib/format";
import type { CustomerRow } from "@/features/pelanggan/types";

interface CustomerListProps {
  rows: readonly CustomerRow[];
  canManageTempo: boolean;
  onEdit: (row: CustomerRow) => void;
  onAdd: () => void;
}

/** Daftar pelanggan: baris lega di desktop, kartu di mobile (tanpa tabel). */
export function CustomerList({
  rows,
  canManageTempo,
  onEdit,
  onAdd,
}: CustomerListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return rows;

    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(keyword) ||
        row.phone.toLowerCase().includes(keyword),
    );
  }, [rows, search]);

  return (
    <Card className="flex min-w-0 flex-col p-5">
      <CardHeader
        title="Data Pelanggan"
        subtitle="Penanda boleh tempo hanya bisa diubah role berwenang."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchField
              label="Cari pelanggan"
              placeholder="Cari nama atau no. HP…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full sm:w-[240px]"
            />
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
            Belum ada pelanggan
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            Tambahkan pelanggan agar bisa memakai pembayaran tempo.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-10 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            Tidak ada pelanggan yang cocok
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            Coba kata kunci lain.
          </p>
        </div>
      ) : (
        <ul
          aria-label="Data pelanggan"
          className="divide-y divide-line-faint rounded-control border border-line"
        >
          {filtered.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-line-subtle sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="m-0 truncate text-body font-semibold text-ink">
                    {row.name}
                  </p>
                  {row.allowTempo ? (
                    <StatusBadge tone="brand">Boleh tempo</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">Tunai</StatusBadge>
                  )}
                  {row.activeTempo ? (
                    <StatusBadge tone="warning">Tempo aktif</StatusBadge>
                  ) : null}
                </div>
                <p className="m-0 mt-0.5 text-meta text-ink-muted">
                  {row.phone || "Tanpa no. HP"}
                  {row.activeCreditCount > 0
                    ? ` · ${formatNumber(row.activeCreditCount)} tagihan berjalan`
                    : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[32px] px-2.5 text-meta"
                  onClick={() => onEdit(row)}
                >
                  Ubah
                </Button>
              </div>

              {!canManageTempo && row.allowTempo ? (
                <span className="sr-only">
                  Penanda tempo hanya bisa diubah role berwenang
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
