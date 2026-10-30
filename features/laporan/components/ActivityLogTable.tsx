import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import type { Role } from "@/constants/roles";
import { formatDateTimeShort } from "@/lib/format";
import type {
  ActivityAction,
  ActivityLog,
} from "@/features/laporan/types";

const ACTION_TONES: Record<ActivityAction, BadgeTone> = {
  Membuat: "success",
  Mengubah: "warning",
  Membatalkan: "danger",
  Membuka: "neutral",
};

const columns: readonly DataTableColumn<ActivityLog>[] = [
  {
    id: "time",
    header: "Waktu",
    cellClassName: "whitespace-nowrap text-ink-muted",
    cell: (log) => formatDateTimeShort(log.loggedAt),
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
  logs: readonly ActivityLog[];
  roles: readonly Role[];
}

export function ActivityLogTable({ logs, roles }: ActivityLogTableProps) {
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
        <Select aria-label="Filter role" className="h-10 w-auto px-2.5">
          <option>Semua role</option>
          {roles.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </Select>
      </div>

      <DataTable
        ariaLabel="Log aktivitas"
        columns={columns}
        rows={logs}
        rowKey={(log) => log.id}
        minWidth={720}
        density="roomy"
        headerTone="soft"
      />
    </Card>
  );
}
