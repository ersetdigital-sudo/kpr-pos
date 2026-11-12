"use client";

import { SearchField } from "@/components/ui/SearchField";
import { cn } from "@/lib/cn";
import type { SalesOrderStatus } from "@/lib/store/types";

/** Filter tampilan daftar pesanan; tidak mengubah data maupun perhitungan. */
export type OrderStatusFilter = "all" | SalesOrderStatus;

export const ORDER_STATUS_FILTERS: readonly {
  id: OrderStatusFilter;
  label: string;
}[] = [
  { id: "all", label: "Semua" },
  { id: "Menunggu bayar", label: "Menunggu bayar" },
  { id: "COD - menunggu pembayaran", label: "COD" },
  { id: "Tempo - menunggu pembayaran", label: "Tempo" },
  { id: "Lunas", label: "Lunas" },
  { id: "Dibatalkan", label: "Dibatalkan" },
];

interface OrderFilterBarProps {
  value: OrderStatusFilter;
  onChange: (value: OrderStatusFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  counts: Record<OrderStatusFilter, number>;
}

export function OrderFilterBar({
  value,
  onChange,
  search,
  onSearchChange,
  counts,
}: OrderFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        role="group"
        aria-label="Filter status pesanan"
        className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pt-0.5 pb-1 sm:flex-wrap sm:pb-0"
      >
        {ORDER_STATUS_FILTERS.map((filter) => {
          const active = filter.id === value;

          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(filter.id)}
              className={cn(
                "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-pill border px-3 font-sans text-label font-semibold whitespace-nowrap",
                active
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line bg-surface text-ink-muted hover:bg-line-subtle hover:text-ink",
              )}
            >
              {filter.label}
              <span
                className={cn(
                  "text-meta font-semibold",
                  active ? "text-brand" : "text-ink-muted",
                )}
              >
                {counts[filter.id]}
              </span>
            </button>
          );
        })}
      </div>

      <SearchField
        label="Cari pesanan"
        placeholder="Cari pelanggan atau no. pesanan"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="w-full sm:w-[270px] sm:shrink-0"
      />
    </div>
  );
}
