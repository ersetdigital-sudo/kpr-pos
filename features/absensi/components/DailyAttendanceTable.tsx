"use client";

import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import type { AttendanceDisplayStatus } from "@/lib/store/types";
import type { Branch } from "@/lib/store/types";
import type { AttendanceRow } from "@/features/absensi/types";

const STATUS_TONES: Record<AttendanceDisplayStatus, BadgeTone> = {
  Hadir: "success",
  Telat: "warning",
  Izin: "info",
  Sakit: "warning",
  Alpa: "danger",
  "Belum absen": "neutral",
};

const columns: readonly DataTableColumn<AttendanceRow>[] = [
  {
    id: "employee",
    header: "Karyawan",
    cell: (row) => (
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-line text-meta font-bold text-ink-soft">
          {row.initials}
        </span>
        <div>
          <div className="font-semibold text-ink">{row.employeeName}</div>
          <div className="text-meta text-ink-muted">{row.role}</div>
        </div>
      </div>
    ),
  },
  {
    id: "branch",
    header: "Cabang",
    cellClassName: "text-ink-soft",
    cell: (row) => row.branchName,
  },
  {
    id: "checkIn",
    header: "Jam Masuk",
    cellClassName: "font-semibold text-ink",
    cell: (row) => row.checkIn ?? "—",
  },
  {
    id: "checkOut",
    header: "Jam Pulang",
    cellClassName: "font-semibold text-ink",
    cell: (row) => row.checkOut ?? "—",
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => (
      <StatusBadge tone={STATUS_TONES[row.status]}>{row.status}</StatusBadge>
    ),
  },
];

interface DailyAttendanceTableProps {
  rows: readonly AttendanceRow[];
  date: string;
  onDateChange: (date: string) => void;
  branches: readonly Branch[];
  branchId: string;
  onBranchChange: (branchId: string) => void;
  canFilterBranch: boolean;
  title: string;
}

export function DailyAttendanceTable({
  rows,
  date,
  onDateChange,
  branches,
  branchId,
  onBranchChange,
  canFilterBranch,
  title,
}: DailyAttendanceTableProps) {
  return (
    <Card className="flex flex-col gap-3.5 p-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-2.5">
        <div>
          <h2 className="m-0 text-card-title font-bold text-ink">{title}</h2>
          <p className="mt-0.5 mb-0 text-label text-ink-muted">
            Status telat dihitung dari jam masuk di Pengaturan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            aria-label="Tanggal kehadiran"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className="h-10 w-[152px] text-label"
          />
          {canFilterBranch ? (
            <Select
              aria-label="Filter cabang absensi"
              value={branchId}
              onChange={(event) => onBranchChange(event.target.value)}
              className="h-10 w-auto max-w-[180px] text-label"
            >
              <option value="all">Semua cabang</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
          Belum ada data kehadiran untuk filter ini.
        </div>
      ) : (
        <DataTable
          ariaLabel="Kehadiran harian"
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
