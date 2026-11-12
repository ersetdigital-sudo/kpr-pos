"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import type { RolePermissions } from "@/config/permissions";
import {
  countKasbonFilters,
  kasbonStatusFilterMatches,
} from "@/features/kasbon/data/kasbon-calculations";
import { KasbonFilters } from "@/features/kasbon/components/KasbonFilters";
import {
  KasbonCard,
  KasbonListRow,
} from "@/features/kasbon/components/KasbonListRow";
import type {
  KasbonRow,
  KasbonStage,
  KasbonStatusFilter,
} from "@/features/kasbon/types";

interface KasbonListProps {
  rows: readonly KasbonRow[];
  permissions: RolePermissions;
  currentEmployeeId: string;
  today: string;
  title: string;
  canApply: boolean;
  onApply: () => void;
  onApprove: (row: KasbonRow, stage: KasbonStage) => void;
  onReject: (row: KasbonRow, stage: KasbonStage) => void;
  onSettle: (row: KasbonRow) => void;
  onViewDetail: (row: KasbonRow) => void;
}

/** Daftar kasbon: baris lega di desktop, kartu di mobile. */
export function KasbonList({
  rows,
  permissions,
  currentEmployeeId,
  today,
  title,
  canApply,
  onApply,
  onApprove,
  onReject,
  onSettle,
  onViewDetail,
}: KasbonListProps) {
  const [statusFilter, setStatusFilter] =
    useState<KasbonStatusFilter>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => countKasbonFilters(rows), [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (!kasbonStatusFilterMatches(row, statusFilter)) return false;
      if (!keyword) return true;

      return (
        row.employeeName.toLowerCase().includes(keyword) ||
        row.reason.toLowerCase().includes(keyword)
      );
    });
  }, [rows, search, statusFilter]);

  const isFiltering = statusFilter !== "all" || search.trim().length > 0;

  function resetFilters() {
    setStatusFilter("all");
    setSearch("");
  }

  return (
    <Card className="flex min-w-0 flex-col p-5">
      <CardHeader
        title={title}
        subtitle="Persetujuan berurutan: Accounting, Manager, lalu Owner."
        action={
          <span className="text-meta text-ink-muted">
            {filteredRows.length} dari {rows.length} kasbon
          </span>
        }
        className="mb-3.5"
      />

      <KasbonFilters
        value={statusFilter}
        onChange={setStatusFilter}
        search={search}
        onSearchChange={setSearch}
        counts={counts}
      />

      {rows.length === 0 ? (
        <div className="mt-4 rounded-control border border-dashed border-line-strong bg-canvas px-4 py-10 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            Belum ada kasbon
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            Ajukan kasbon pertama; persetujuan berjalan otomatis ke Accounting,
            Manager, lalu Owner.
          </p>
          {canApply ? (
            <Button variant="primary" size="md" className="mt-4" onClick={onApply}>
              Ajukan kasbon
            </Button>
          ) : null}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="mt-4 rounded-control border border-dashed border-line-strong bg-canvas px-4 py-10 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            Tidak ada kasbon yang cocok
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            Coba kata kunci lain atau kembalikan filter ke semua status.
          </p>
          {isFiltering ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={resetFilters}
            >
              Reset filter
            </Button>
          ) : null}
        </div>
      ) : (
        <ul
          aria-label={title}
          className="mt-4 divide-y divide-line-faint rounded-control border border-line"
        >
          {filteredRows.map((row) => (
            <li key={row.id}>
              <KasbonListRow
                row={row}
                permissions={permissions}
                currentEmployeeId={currentEmployeeId}
                today={today}
                onApprove={onApprove}
                onReject={onReject}
                onSettle={onSettle}
                onViewDetail={onViewDetail}
              />
              <KasbonCard
                row={row}
                permissions={permissions}
                currentEmployeeId={currentEmployeeId}
                today={today}
                onApprove={onApprove}
                onReject={onReject}
                onSettle={onSettle}
                onViewDetail={onViewDetail}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
