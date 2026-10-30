"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber, formatRupiahCompact } from "@/lib/format";
import type { BranchFilters, BranchRow } from "@/features/cabang/types";

interface BranchTableProps {
  rows: readonly BranchRow[];
  filters: BranchFilters;
  canManage: boolean;
  activeBranchId: string;
  onFiltersChange: (patch: Partial<BranchFilters>) => void;
  onEdit: (row: BranchRow) => void;
  onToggleActive: (row: BranchRow) => void;
}

export function BranchTable({
  rows,
  filters,
  canManage,
  activeBranchId,
  onFiltersChange,
  onEdit,
  onToggleActive,
}: BranchTableProps) {
  const columns: readonly DataTableColumn<BranchRow>[] = [
    {
      id: "branch",
      header: "Cabang",
      cell: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.name}</div>
          <div className="text-meta text-ink-muted">{row.address}</div>
          <div className="text-meta text-ink-muted">{row.phone}</div>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tone={row.isActive ? "success" : "neutral"}>
            {row.isActive ? "Aktif" : "Nonaktif"}
          </StatusBadge>
          {row.id === activeBranchId ? (
            <span className="text-meta text-brand">Cabang aktif</span>
          ) : null}
        </div>
      ),
    },
    {
      id: "employees",
      header: "Karyawan",
      align: "right",
      cellClassName: "font-semibold text-ink",
      cell: (row) => formatNumber(row.employeeCount),
    },
    {
      id: "products",
      header: "Produk Berstok",
      align: "right",
      cellClassName: "font-semibold text-ink",
      cell: (row) => formatNumber(row.productsInStock),
    },
    {
      id: "revenue",
      header: "Omzet Bulan Ini",
      align: "right",
      cellClassName: "font-semibold text-ink",
      cell: (row) => formatRupiahCompact(row.monthlyRevenue),
    },
    ...(canManage
      ? [
          {
            id: "action",
            header: <span className="sr-only">Aksi</span>,
            align: "right" as const,
            cell: (row: BranchRow) => (
              <div className="flex justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[32px] px-2.5 text-meta"
                  onClick={() => onEdit(row)}
                >
                  Edit
                </Button>
                {row.isActive ? (
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    className="h-[32px] px-2.5 text-meta"
                    disabled={row.id === activeBranchId}
                    title={
                      row.id === activeBranchId
                        ? "Pindah cabang aktif dulu sebelum menonaktifkan"
                        : undefined
                    }
                    onClick={() => onToggleActive(row)}
                  >
                    Nonaktifkan
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-[32px] px-2.5 text-meta"
                    onClick={() => onToggleActive(row)}
                  >
                    Aktifkan
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card className="flex flex-col gap-3.5 p-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-2.5">
        <div>
          <h2 className="m-0 text-card-title font-bold text-ink">Daftar Cabang</h2>
          <p className="mt-0.5 mb-0 text-label text-ink-muted">
            Cabang baru otomatis punya stok 0 untuk semua produk.
          </p>
        </div>
        <Select
          aria-label="Filter status cabang"
          value={filters.status}
          onChange={(event) =>
            onFiltersChange({
              status: event.target.value as BranchFilters["status"],
            })
          }
          className="h-10 w-auto min-w-[140px] text-label"
        >
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
          Belum ada cabang yang cocok dengan filter ini.
        </div>
      ) : (
        <DataTable
          ariaLabel="Daftar cabang"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          minWidth={860}
          density="roomy"
          headerTone="soft"
        />
      )}
    </Card>
  );
}
