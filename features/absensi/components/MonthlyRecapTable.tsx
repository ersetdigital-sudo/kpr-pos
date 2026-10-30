"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import type { MonthlyRecapRow } from "@/features/absensi/types";

const columns: readonly DataTableColumn<MonthlyRecapRow>[] = [
  {
    id: "employee",
    header: "Karyawan",
    cell: (row) => (
      <div>
        <div className="font-semibold text-ink">{row.employeeName}</div>
        <div className="text-meta text-ink-muted">
          {row.role} · {row.branchName}
        </div>
      </div>
    ),
  },
  {
    id: "present",
    header: "Hadir",
    align: "right",
    cellClassName: "font-semibold text-success-ink",
    cell: (row) => row.present,
  },
  {
    id: "late",
    header: "Telat",
    align: "right",
    cellClassName: "font-semibold text-brand",
    cell: (row) => row.late,
  },
  {
    id: "leave",
    header: "Izin",
    align: "right",
    cellClassName: "text-ink-soft",
    cell: (row) => row.leave,
  },
  {
    id: "sick",
    header: "Sakit",
    align: "right",
    cellClassName: "text-ink-soft",
    cell: (row) => row.sick,
  },
  {
    id: "absent",
    header: "Alpa",
    align: "right",
    cellClassName: "font-semibold text-danger-ink",
    cell: (row) => row.absent,
  },
  {
    id: "total",
    header: "Hari Tercatat",
    align: "right",
    cellClassName: "text-ink-muted",
    cell: (row) => row.totalDays,
  },
];

interface MonthlyRecapTableProps {
  rows: readonly MonthlyRecapRow[];
  month: string;
  onMonthChange: (month: string) => void;
  onExport: () => void;
}

export function MonthlyRecapTable({
  rows,
  month,
  onMonthChange,
  onExport,
}: MonthlyRecapTableProps) {
  return (
    <Card className="flex flex-col gap-3.5 p-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-2.5">
        <div>
          <h2 className="m-0 text-card-title font-bold text-ink">
            Rekap Bulanan
          </h2>
          <p className="mt-0.5 mb-0 text-label text-ink-muted">
            Jumlah hadir, telat, izin, sakit, dan alpa per karyawan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="month"
            aria-label="Bulan rekap absensi"
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
            className="h-10 w-[152px] text-label"
          />
          <Button variant="outline" size="md" onClick={onExport}>
            Export Excel
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
          Belum ada catatan absensi pada bulan ini.
        </div>
      ) : (
        <DataTable
          ariaLabel="Rekap absensi bulanan"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.employeeId}
          minWidth={720}
          density="roomy"
          headerTone="soft"
        />
      )}
    </Card>
  );
}
