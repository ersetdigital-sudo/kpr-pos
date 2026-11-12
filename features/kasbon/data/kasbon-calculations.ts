import type { RolePermissions } from "@/config/permissions";
import type {
  AppDatabase,
  Kasbon,
  KasbonStage,
  KasbonStatus,
  KasbonTempoUnit,
} from "@/lib/store/types";
import type {
  KasbonRow,
  KasbonStageState,
  KasbonStats,
  KasbonStatusFilter,
} from "@/features/kasbon/types";

export const KASBON_STAGES: readonly KasbonStage[] = [
  "Accounting",
  "Manager",
  "Owner",
];

const STAGE_PERMISSION_KEYS: Record<KasbonStage, keyof RolePermissions> = {
  Accounting: "canApproveKasbonAccounting",
  Manager: "canApproveKasbonManager",
  Owner: "canApproveKasbonOwner",
};

export function stagePermissionKey(
  stage: KasbonStage,
): keyof RolePermissions {
  return STAGE_PERMISSION_KEYS[stage];
}

/** Tahap yang sedang menunggu keputusan, atau null bila sudah final. */
export function stageOfStatus(status: KasbonStatus): KasbonStage | null {
  if (status === "Menunggu Accounting") return "Accounting";
  if (status === "Menunggu Manager") return "Manager";
  if (status === "Menunggu Owner") return "Owner";
  return null;
}

/** Kasbon belum selesai (masih menunggu persetujuan atau berjalan). */
export function isActiveKasbonStatus(status: KasbonStatus): boolean {
  return status !== "Lunas" && status !== "Ditolak";
}

export function isWaitingKasbonStatus(status: KasbonStatus): boolean {
  return stageOfStatus(status) !== null;
}

/** Pemegang izin tahap lain juga perlu membaca kasbon orang lain. */
export function canSeeAllKasbon(permissions: RolePermissions): boolean {
  return (
    permissions.canViewAllKasbon ||
    permissions.canApproveKasbonAccounting ||
    permissions.canApproveKasbonManager ||
    permissions.canApproveKasbonOwner ||
    permissions.canSettleKasbon
  );
}

export function buildKasbonRows(database: AppDatabase): KasbonRow[] {
  const employeeById = new Map(
    database.employees.map((employee) => [employee.id, employee]),
  );
  const branchNameById = new Map(
    database.branches.map((branch) => [branch.id, branch.name]),
  );

  return database.kasbon
    .map((item: Kasbon) => {
      const employee = employeeById.get(item.employeeId);

      return {
        ...item,
        employeeName: employee?.name ?? "Karyawan",
        initials: employee?.initials ?? "?",
        branchName: branchNameById.get(item.branchId) ?? "Cabang",
        approvals: [...item.approvals].sort((first, second) =>
          first.decidedAt.localeCompare(second.decidedAt),
        ),
      };
    })
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export function getVisibleKasbon(
  rows: readonly KasbonRow[],
  employeeId: string,
  permissions: RolePermissions,
): KasbonRow[] {
  if (canSeeAllKasbon(permissions)) return [...rows];

  return rows.filter((row) => row.employeeId === employeeId);
}

/** Tahap yang boleh diproses user ini untuk kasbon tersebut. */
export function canReviewKasbon(
  row: KasbonRow,
  permissions: RolePermissions,
  employeeId: string,
): KasbonStage | null {
  const stage = stageOfStatus(row.status);

  if (!stage) return null;
  // Pemohon tidak boleh menyetujui kasbonnya sendiri.
  if (row.employeeId === employeeId) return null;

  return permissions[stagePermissionKey(stage)] ? stage : null;
}

export function canSettleKasbon(
  row: KasbonRow,
  permissions: RolePermissions,
): boolean {
  return row.status === "Disetujui" && permissions.canSettleKasbon;
}

export function buildStageStates(row: KasbonRow): KasbonStageState[] {
  const runningStage = stageOfStatus(row.status);

  return KASBON_STAGES.map((stage) => {
    const approval =
      row.approvals.find((item) => item.stage === stage) ?? null;

    if (approval) {
      return {
        stage,
        state: approval.decision === "Ditolak" ? "ditolak" : "selesai",
        approval,
      };
    }

    return {
      stage,
      state: runningStage === stage ? "berjalan" : "menunggu",
      approval: null,
    };
  });
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = Date.UTC(year, month - 1, day) + days * 24 * 60 * 60 * 1000;

  return new Date(next).toISOString().slice(0, 10);
}

/** Estimasi jatuh tempo tempo; tanggal pasti baru dihitung saat Owner setuju. */
export function estimateDueDate(
  baseDate: string,
  value: number,
  unit: KasbonTempoUnit,
): string {
  return addDays(baseDate, unit === "minggu" ? value * 7 : value);
}

/** Kasbon tempo Disetujui yang sudah melewati tanggal jatuh tempo. */
export function isKasbonOverdue(row: KasbonRow, today: string): boolean {
  return (
    row.status === "Disetujui" &&
    row.repaymentMethod === "tempo" &&
    row.dueDate !== null &&
    row.dueDate < today
  );
}

export function repaymentLabel(row: KasbonRow): string {
  if (row.repaymentMethod === "potong_gaji") return "Potong gaji";

  return `Tempo ${row.tempoValue ?? 0} ${row.tempoUnit ?? "hari"}`;
}

export function kasbonStatusFilterMatches(
  row: KasbonRow,
  filter: KasbonStatusFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "menunggu") return isWaitingKasbonStatus(row.status);

  return row.status === filter;
}

export function countKasbonFilters(
  rows: readonly KasbonRow[],
): Record<KasbonStatusFilter, number> {
  const counts: Record<KasbonStatusFilter, number> = {
    all: rows.length,
    menunggu: 0,
    Disetujui: 0,
    Lunas: 0,
    Ditolak: 0,
  };

  rows.forEach((row) => {
    if (isWaitingKasbonStatus(row.status)) counts.menunggu += 1;
    if (row.status === "Disetujui") counts.Disetujui += 1;
    if (row.status === "Lunas") counts.Lunas += 1;
    if (row.status === "Ditolak") counts.Ditolak += 1;
  });

  return counts;
}

export function calculateKasbonStats(
  rows: readonly KasbonRow[],
  permissions: RolePermissions,
  employeeId: string,
  today: string,
): KasbonStats {
  const active = rows.filter((row) => isActiveKasbonStatus(row.status));
  const awaiting = rows.filter(
    (row) => canReviewKasbon(row, permissions, employeeId) !== null,
  );
  const dueRows = rows
    .filter(
      (row) =>
        row.status === "Disetujui" &&
        row.repaymentMethod === "tempo" &&
        row.dueDate !== null,
    )
    .sort((first, second) =>
      (first.dueDate ?? "").localeCompare(second.dueDate ?? ""),
    );

  return {
    activeCount: active.length,
    activeAmount: active.reduce((total, row) => total + row.amount, 0),
    awaitingMyApproval: awaiting.length,
    nearestDueDate: dueRows[0]?.dueDate ?? null,
    nearestDueName: dueRows[0]?.employeeName ?? null,
    overdueCount: rows.filter((row) => isKasbonOverdue(row, today)).length,
  };
}

/** Kasbon aktif milik user ini, untuk mencegah pengajuan ganda. */
export function findMyActiveKasbon(
  rows: readonly KasbonRow[],
  employeeId: string,
): KasbonRow | null {
  return (
    rows.find(
      (row) =>
        row.employeeId === employeeId && isActiveKasbonStatus(row.status),
    ) ?? null
  );
}
