"use client";

import type { ChangeEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ALL_ROLES, type Role } from "@/constants/roles";
import type { Branch } from "@/lib/store/types";
import type {
  EmployeeFilters,
  EmployeeRow,
} from "@/features/karyawan/types";

interface EmployeeTableProps {
  rows: readonly EmployeeRow[];
  filters: EmployeeFilters;
  branches: readonly Branch[];
  canManage: boolean;
  canDelete: boolean;
  currentEmployeeId: string;
  onFiltersChange: (patch: Partial<EmployeeFilters>) => void;
  onEdit: (row: EmployeeRow) => void;
  onToggleActive: (row: EmployeeRow) => void;
  onDelete: (row: EmployeeRow) => void;
}

export function EmployeeTable({
  rows,
  filters,
  branches,
  canManage,
  canDelete,
  currentEmployeeId,
  onFiltersChange,
  onEdit,
  onToggleActive,
  onDelete,
}: EmployeeTableProps) {
  const columns: readonly DataTableColumn<EmployeeRow>[] = [
    {
      id: "employee",
      header: "Karyawan",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={row.initials} />
          <div>
            <div className="font-semibold text-ink">{row.name}</div>
            <div className="text-meta text-ink-muted">
              {row.phone || "No. HP belum diisi"}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (row) => (
        <StatusBadge tone="brand" strong>
          {row.role}
        </StatusBadge>
      ),
    },
    {
      id: "branch",
      header: "Cabang",
      cellClassName: "text-ink-soft",
      cell: (row) => row.branchName,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge tone={row.isActive ? "success" : "neutral"}>
          {row.isActive ? "Aktif" : "Nonaktif"}
        </StatusBadge>
      ),
    },
    ...(canManage
      ? [
          {
            id: "action",
            header: <span className="sr-only">Aksi</span>,
            align: "right" as const,
            cell: (row: EmployeeRow) => (
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
                    disabled={row.id === currentEmployeeId}
                    title={
                      row.id === currentEmployeeId
                        ? "Tidak bisa menonaktifkan akun yang sedang dipakai"
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
                {canDelete && row.id !== currentEmployeeId ? (
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    className="h-[32px] px-2.5 text-meta"
                    onClick={() => onDelete(row)}
                  >
                    Hapus
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card
      role="region"
      aria-label="Daftar karyawan"
      className="flex flex-col gap-3.5 p-[18px]"
    >
      <div className="flex flex-wrap gap-2.5">
        <SearchField
          label="Cari karyawan"
          placeholder="Cari nama, no. HP, atau role"
          className="flex-[1_1_240px]"
          value={filters.search}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onFiltersChange({ search: event.target.value })
          }
        />
        <Select
          aria-label="Filter role"
          value={filters.role}
          onChange={(event) =>
            onFiltersChange({ role: event.target.value as Role | "all" })
          }
          className="h-[42px] w-auto min-w-[140px] text-label"
        >
          <option value="all">Semua role</option>
          {ALL_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter cabang"
          value={filters.branchId}
          onChange={(event) =>
            onFiltersChange({ branchId: event.target.value })
          }
          className="h-[42px] w-auto min-w-[140px] text-label"
        >
          <option value="all">Semua cabang</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter status karyawan"
          value={filters.status}
          onChange={(event) =>
            onFiltersChange({
              status: event.target.value as EmployeeFilters["status"],
            })
          }
          className="h-[42px] w-auto min-w-[130px] text-label"
        >
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
          Belum ada karyawan yang cocok dengan filter ini.
        </div>
      ) : (
        <DataTable
          ariaLabel="Daftar karyawan"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          minWidth={760}
          density="roomy"
          headerTone="soft"
        />
      )}
    </Card>
  );
}
