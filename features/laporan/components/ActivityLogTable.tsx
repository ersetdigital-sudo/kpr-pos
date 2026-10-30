"use client";

import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import type { Role } from "@/constants/roles";
import { formatDateTimeShort } from "@/lib/format";
import type { ActivityAction } from "@/lib/store/types";
import type { ReportLogRow, ReportLogUser } from "@/features/laporan/types";

const ACTION_TONES: Record<ActivityAction, BadgeTone> = {
  Membuat: "success",
  Mengubah: "warning",
  Menghapus: "danger",
  Membayar: "success",
  Membatalkan: "danger",
  Refund: "danger",
  Membuka: "neutral",
};

const columns: readonly DataTableColumn<ReportLogRow>[] = [
  {
    id: "time",
    header: "Waktu",
    cellClassName: "whitespace-nowrap text-ink-muted",
    cell: (log) => formatDateTimeShort(log.at),
  },
  {
    id: "user",
    header: "Pengguna",
    cellClassName: "font-semibold text-ink",
    cell: (log) => log.userName,
  },
  {
    id: "role",
    header: "Role",
    cellClassName: "text-ink-soft",
    cell: (log) => log.role,
  },
  {
    id: "branch",
    header: "Cabang",
    cellClassName: "text-ink-soft",
    cell: (log) => log.branchName,
  },
  {
    id: "action",
    header: "Aksi",
    cell: (log) => (
      <StatusBadge tone={ACTION_TONES[log.action]}>{log.action}</StatusBadge>
    ),
  },
  {
    id: "detail",
    header: "Detail",
    cellClassName: "text-ink-soft",
    cell: (log) => log.detail,
  },
];

interface ActivityLogTableProps {
  logs: readonly ReportLogRow[];
  roles: readonly Role[];
  users: readonly ReportLogUser[];
  roleFilter: Role | "all";
  userFilter: string | "all";
  onRoleChange: (role: Role | "all") => void;
  onUserChange: (userId: string | "all") => void;
}

export function ActivityLogTable({
  logs,
  roles,
  users,
  roleFilter,
  userFilter,
  onRoleChange,
  onUserChange,
}: ActivityLogTableProps) {
  return (
    <Card className="p-5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="m-0 text-card-title font-bold text-ink">
            Log Aktivitas
          </h2>
          <p className="mt-0.5 mb-0 text-label text-ink-muted">
            Siapa membuka, mengubah, dan membuat data
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            aria-label="Filter role"
            value={roleFilter}
            onChange={(event) =>
              onRoleChange(event.target.value as Role | "all")
            }
            className="h-10 w-auto px-2.5"
          >
            <option value="all">Semua role</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter user"
            value={userFilter}
            onChange={(event) => onUserChange(event.target.value)}
            className="h-10 w-auto px-2.5"
          >
            <option value="all">Semua user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
          Belum ada aktivitas pada filter ini.
        </div>
      ) : (
        <DataTable
          ariaLabel="Log aktivitas"
          columns={columns}
          rows={logs}
          rowKey={(log) => log.id}
          minWidth={860}
          density="roomy"
          headerTone="soft"
        />
      )}
    </Card>
  );
}
