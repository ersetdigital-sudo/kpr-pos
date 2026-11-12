"use client";

import { FilterChip } from "@/components/ui/FilterChip";
import { SearchField } from "@/components/ui/SearchField";
import type { KasbonStatusFilter } from "@/features/kasbon/types";

const KASBON_STATUS_FILTERS: readonly {
  id: KasbonStatusFilter;
  label: string;
}[] = [
  { id: "all", label: "Semua" },
  { id: "menunggu", label: "Menunggu" },
  { id: "Disetujui", label: "Disetujui" },
  { id: "Lunas", label: "Lunas" },
  { id: "Ditolak", label: "Ditolak" },
];

interface KasbonFiltersProps {
  value: KasbonStatusFilter;
  onChange: (value: KasbonStatusFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  counts: Record<KasbonStatusFilter, number>;
}

/** Filter chip status + pencarian nama karyawan; hanya menyaring tampilan. */
export function KasbonFilters({
  value,
  onChange,
  search,
  onSearchChange,
  counts,
}: KasbonFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        role="group"
        aria-label="Filter status kasbon"
        className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pt-0.5 pb-1 sm:flex-wrap sm:pb-0"
      >
        {KASBON_STATUS_FILTERS.map((filter) => {
          const active = filter.id === value;

          return (
            <FilterChip
              key={filter.id}
              active={active}
              count={counts[filter.id]}
              onClick={() => onChange(filter.id)}
            >
              {filter.label}
            </FilterChip>
          );
        })}
      </div>

      <SearchField
        label="Cari kasbon"
        placeholder="Cari nama karyawan"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="w-full sm:w-[270px] sm:shrink-0"
      />
    </div>
  );
}
