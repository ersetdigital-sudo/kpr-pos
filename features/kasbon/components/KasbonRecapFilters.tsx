"use client";

import { Card } from "@/components/ui/Card";
import { FilterChip } from "@/components/ui/FilterChip";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import { KASBON_STATUS_FILTER_LABELS } from "@/features/kasbon/data/kasbon-recap-calculations";
import type { Branch } from "@/lib/store/types";
import type {
  KasbonRecapFilterState,
  KasbonStatusFilter,
} from "@/features/kasbon/types";

const STATUS_OPTIONS: readonly KasbonStatusFilter[] = [
  "all",
  "menunggu",
  "Disetujui",
  "Lunas",
  "Ditolak",
];

interface KasbonRecapFiltersProps {
  filters: KasbonRecapFilterState;
  onChange: (filters: KasbonRecapFilterState) => void;
  branches: readonly Branch[];
  canChooseBranch: boolean;
  employees: readonly { id: string; name: string }[];
  showEmployeeFilter: boolean;
  counts: Record<KasbonStatusFilter, number>;
}

/** Filter rekap: periode (bulan/rentang), cabang, karyawan, dan status. */
export function KasbonRecapFilters({
  filters,
  onChange,
  branches,
  canChooseBranch,
  employees,
  showEmployeeFilter,
  counts,
}: KasbonRecapFiltersProps) {
  return (
    <Card className="flex flex-col gap-3.5 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-ink-muted">Periode</span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-control border border-line-strong">
              {(
                [
                  { id: "month", label: "Bulan" },
                  { id: "range", label: "Rentang tanggal" },
                ] as const
              ).map((mode, index) => {
                const active = filters.periodMode === mode.id;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onChange({ ...filters, periodMode: mode.id })
                    }
                    className={cn(
                      "h-[38px] cursor-pointer border-0 px-3 font-sans text-label font-semibold whitespace-nowrap",
                      active
                        ? "bg-ink text-white"
                        : "bg-surface text-ink-muted",
                      index > 0 && "border-l border-line-strong",
                    )}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {filters.periodMode === "month" ? (
              <Input
                type="month"
                aria-label="Bulan rekap kasbon"
                value={filters.month}
                onChange={(event) =>
                  onChange({ ...filters, month: event.target.value })
                }
                className="h-[38px] w-[160px] text-label"
              />
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <Input
                  type="date"
                  aria-label="Tanggal mulai rekap kasbon"
                  value={filters.start}
                  onChange={(event) =>
                    onChange({ ...filters, start: event.target.value })
                  }
                  className="h-[38px] w-[150px] text-label"
                />
                <span className="text-label text-ink-muted">s/d</span>
                <Input
                  type="date"
                  aria-label="Tanggal akhir rekap kasbon"
                  value={filters.end}
                  onChange={(event) =>
                    onChange({ ...filters, end: event.target.value })
                  }
                  className="h-[38px] w-[150px] text-label"
                />
              </div>
            )}
          </div>
        </div>

        {canChooseBranch ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-ink-muted">Cabang</span>
            <Select
              aria-label="Filter cabang rekap kasbon"
              value={filters.branchId}
              onChange={(event) =>
                onChange({ ...filters, branchId: event.target.value })
              }
              className="h-[38px] w-full text-label sm:w-[190px]"
            >
              <option value="all">Semua cabang</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </label>
        ) : null}

        {showEmployeeFilter ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-semibold text-ink-muted">
              Karyawan
            </span>
            <Select
              aria-label="Filter karyawan rekap kasbon"
              value={filters.employeeId}
              onChange={(event) =>
                onChange({ ...filters, employeeId: event.target.value })
              }
              className="h-[38px] w-full text-label sm:w-[200px]"
            >
              <option value="all">Semua karyawan</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
      </div>

      <div
        role="group"
        aria-label="Filter status rekap kasbon"
        className="flex flex-wrap items-center gap-1.5"
      >
        {STATUS_OPTIONS.map((status) => (
          <FilterChip
            key={status}
            active={filters.status === status}
            count={counts[status]}
            onClick={() => onChange({ ...filters, status })}
          >
            {KASBON_STATUS_FILTER_LABELS[status]}
          </FilterChip>
        ))}
      </div>
    </Card>
  );
}
