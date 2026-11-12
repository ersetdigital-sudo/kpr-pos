"use client";

import { KasbonRecapFilters } from "@/features/kasbon/components/KasbonRecapFilters";
import { KasbonRecapList } from "@/features/kasbon/components/KasbonRecapList";
import { KasbonRecapStatsCards } from "@/features/kasbon/components/KasbonRecapStatsCards";
import type { Branch } from "@/lib/store/types";
import type {
  KasbonRecapData,
  KasbonRecapFilterState,
  KasbonRow,
} from "@/features/kasbon/types";

interface KasbonRecapViewProps {
  data: KasbonRecapData;
  filters: KasbonRecapFilterState;
  onFiltersChange: (filters: KasbonRecapFilterState) => void;
  branches: readonly Branch[];
  canChooseBranch: boolean;
  employees: readonly { id: string; name: string }[];
  showEmployeeFilter: boolean;
  onOpenDetail: (row: KasbonRow) => void;
}

/** Tampilan rekap: filter, lima kartu ringkasan, lalu rekap per karyawan. */
export function KasbonRecapView({
  data,
  filters,
  onFiltersChange,
  branches,
  canChooseBranch,
  employees,
  showEmployeeFilter,
  onOpenDetail,
}: KasbonRecapViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <KasbonRecapFilters
        filters={filters}
        onChange={onFiltersChange}
        branches={branches}
        canChooseBranch={canChooseBranch}
        employees={employees}
        showEmployeeFilter={showEmployeeFilter}
        counts={data.statusCounts}
      />
      <KasbonRecapStatsCards stats={data.stats} />
      <KasbonRecapList data={data} onOpenDetail={onOpenDetail} />
    </div>
  );
}
