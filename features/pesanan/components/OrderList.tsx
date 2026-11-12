"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import type { SalesOrderStatus } from "@/lib/store/types";
import {
  OrderFilterBar,
  type OrderStatusFilter,
} from "@/features/pesanan/components/OrderFilterBar";
import { OrderCard, OrderListRow } from "@/features/pesanan/components/OrderListRow";
import { OrderStatusDialog } from "@/features/pesanan/components/OrderStatusDialog";
import type {
  OrderRow,
  ScopePermissions,
} from "@/features/pesanan/types";

interface OrderListProps {
  rows: readonly OrderRow[];
  permissions: ScopePermissions;
  canDelete: boolean;
  showSales: boolean;
  title: string;
  onStatusChange: (row: OrderRow, status: SalesOrderStatus) => void;
  onDelete: (row: OrderRow) => void;
  onViewDetail: (row: OrderRow) => void;
  onSettle: (row: OrderRow) => void;
  onCancelCredit: (row: OrderRow) => void;
}

function countByStatus(rows: readonly OrderRow[]): Record<OrderStatusFilter, number> {
  const counts: Record<OrderStatusFilter, number> = {
    all: rows.length,
    "Belum sinkron": 0,
    "Menunggu bayar": 0,
    "COD - menunggu pembayaran": 0,
    "Tempo - menunggu pembayaran": 0,
    Lunas: 0,
    Dibatalkan: 0,
  };

  rows.forEach((row) => {
    counts[row.status] += 1;
  });

  return counts;
}

/**
 * Daftar pesanan: baris lega di desktop, kartu di mobile. Filter status dan
 * pencarian hanya menyaring tampilan, bukan data atau perhitungan.
 */
export function OrderList({
  rows,
  permissions,
  canDelete,
  showSales,
  title,
  onStatusChange,
  onDelete,
  onViewDetail,
  onSettle,
  onCancelCredit,
}: OrderListProps) {
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [statusTarget, setStatusTarget] = useState<OrderRow | null>(null);

  const counts = useMemo(() => countByStatus(rows), [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!keyword) return true;

      return (
        row.customerName.toLowerCase().includes(keyword) ||
        row.orderNumber.toLowerCase().includes(keyword)
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
        subtitle="Lunas otomatis mengurangi stok cabang. COD/Tempo memotong stok saat diproses dan baru menjadi pemasukan saat lunas."
        action={
          <span className="text-meta text-ink-muted">
            {filteredRows.length} dari {rows.length} pesanan
          </span>
        }
        className="mb-3.5"
      />

      <OrderFilterBar
        value={statusFilter}
        onChange={setStatusFilter}
        search={search}
        onSearchChange={setSearch}
        counts={counts}
      />

      {rows.length === 0 ? (
        <div className="mt-4 rounded-control border border-dashed border-line-strong bg-canvas px-4 py-10 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            Belum ada pesanan
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            Pesanan yang disimpan sales akan muncul di sini.
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="mt-4 rounded-control border border-dashed border-line-strong bg-canvas px-4 py-10 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            Tidak ada pesanan yang cocok
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
          {filteredRows.map((order) => (
            <li key={order.id}>
              <OrderListRow
                order={order}
                permissions={permissions}
                canDelete={canDelete}
                showSales={showSales}
                onStatusChange={() => setStatusTarget(order)}
                onDelete={() => onDelete(order)}
                onViewDetail={() => onViewDetail(order)}
                onSettle={() => onSettle(order)}
                onCancelCredit={() => onCancelCredit(order)}
              />
              <OrderCard
                order={order}
                permissions={permissions}
                canDelete={canDelete}
                showSales={showSales}
                onStatusChange={() => setStatusTarget(order)}
                onDelete={() => onDelete(order)}
                onViewDetail={() => onViewDetail(order)}
                onSettle={() => onSettle(order)}
                onCancelCredit={() => onCancelCredit(order)}
              />
            </li>
          ))}
        </ul>
      )}

      {statusTarget ? (
        <OrderStatusDialog
          order={statusTarget}
          onClose={() => setStatusTarget(null)}
          onSelect={(status) => {
            const target = statusTarget;
            setStatusTarget(null);
            onStatusChange(target, status);
          }}
        />
      ) : null}
    </Card>
  );
}
