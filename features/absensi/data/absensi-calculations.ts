import { formatMonthYear } from "@/lib/format";
import { toDateInputValue } from "@/lib/date-range";
import type {
  AppDatabase,
  AttendanceDisplayStatus,
  AttendanceRecord,
} from "@/lib/store/types";
import type {
  AttendanceRow,
  AttendanceScope,
  AttendanceStats,
  LeaveRequestRow,
  MonthlyRecapRow,
} from "@/features/absensi/types";

type BranchScope = string | "all";

/** Membandingkan jam "HH:MM" tanpa konversi tanggal. */
export function isLateCheckIn(checkIn: string, workStartTime: string): boolean {
  return checkIn > workStartTime;
}

export function resolveDisplayStatus(
  record: AttendanceRecord | undefined,
  workStartTime: string,
  date: string,
  today: string,
): AttendanceDisplayStatus {
  if (!record) {
    return date < today ? "Alpa" : "Belum absen";
  }

  if (record.status !== "Hadir") return record.status;

  return record.checkIn && isLateCheckIn(record.checkIn, workStartTime)
    ? "Telat"
    : "Hadir";
}

function isInScope(branchId: string, scope: BranchScope): boolean {
  return scope === "all" || branchId === scope;
}

function visibleEmployees(
  database: AppDatabase,
  branchScope: BranchScope,
  scope: AttendanceScope,
) {
  return database.employees.filter((employee) => {
    if (!employee.isActive) return false;
    if (!scope.canViewAll && employee.id !== scope.viewerEmployeeId) {
      return false;
    }
    return isInScope(employee.branchId, branchScope);
  });
}

export function buildDailyRows(
  database: AppDatabase,
  date: string,
  branchScope: BranchScope,
  scope: AttendanceScope,
  today: string,
): AttendanceRow[] {
  const branchById = new Map(
    database.branches.map((branch) => [branch.id, branch]),
  );

  return visibleEmployees(database, branchScope, scope)
    .map((employee) => {
      const record = database.attendance.find(
        (entry) => entry.employeeId === employee.id && entry.date === date,
      );

      return {
        recordId: record?.id ?? null,
        employeeId: employee.id,
        employeeName: employee.name,
        initials: employee.initials,
        role: employee.role,
        branchName: branchById.get(employee.branchId)?.name ?? "-",
        checkIn: record?.checkIn ?? null,
        checkOut: record?.checkOut ?? null,
        status: resolveDisplayStatus(
          record,
          database.settings.attendance.workStartTime,
          date,
          today,
        ),
      };
    })
    .sort((first, second) => first.employeeName.localeCompare(second.employeeName));
}

export function calculateAttendanceStats(
  rows: readonly AttendanceRow[],
): AttendanceStats {
  const stats: AttendanceStats = {
    present: 0,
    late: 0,
    leave: 0,
    sick: 0,
    absent: 0,
    notCheckedIn: 0,
  };

  rows.forEach((row) => {
    if (row.status === "Hadir") stats.present += 1;
    else if (row.status === "Telat") stats.late += 1;
    else if (row.status === "Izin") stats.leave += 1;
    else if (row.status === "Sakit") stats.sick += 1;
    else if (row.status === "Alpa") stats.absent += 1;
    else stats.notCheckedIn += 1;
  });

  return stats;
}

export function buildLeaveRows(
  database: AppDatabase,
  branchScope: BranchScope,
  scope: AttendanceScope,
): LeaveRequestRow[] {
  const employeeById = new Map(
    database.employees.map((employee) => [employee.id, employee]),
  );
  const branchById = new Map(
    database.branches.map((branch) => [branch.id, branch]),
  );

  return database.leaveRequests
    .filter((request) => isInScope(request.branchId, branchScope))
    .filter(
      (request) =>
        scope.canViewAll || request.employeeId === scope.viewerEmployeeId,
    )
    .map((request) => {
      const employee = employeeById.get(request.employeeId);

      return {
        id: request.id,
        employeeId: request.employeeId,
        employeeName: employee?.name ?? "Karyawan",
        initials: employee?.initials ?? "?",
        branchName: branchById.get(request.branchId)?.name ?? "-",
        date: request.date,
        reason: request.reason,
        status: request.status,
        reviewedByName: request.reviewedBy
          ? (employeeById.get(request.reviewedBy)?.name ?? null)
          : null,
        createdAt: request.createdAt,
      };
    })
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    );
}

/** Rekap dari catatan absensi bulan terpilih; "Telat" dihitung dari jam masuk. */
export function buildMonthlyRecap(
  database: AppDatabase,
  month: string,
  branchScope: BranchScope,
  scope: AttendanceScope,
): MonthlyRecapRow[] {
  const branchById = new Map(
    database.branches.map((branch) => [branch.id, branch]),
  );
  const workStartTime = database.settings.attendance.workStartTime;

  return visibleEmployees(database, branchScope, scope)
    .map((employee) => {
      const records = database.attendance.filter(
        (entry) =>
          entry.employeeId === employee.id && entry.date.startsWith(month),
      );

      const row: MonthlyRecapRow = {
        employeeId: employee.id,
        employeeName: employee.name,
        role: employee.role,
        branchName: branchById.get(employee.branchId)?.name ?? "-",
        present: 0,
        late: 0,
        leave: 0,
        sick: 0,
        absent: 0,
        totalDays: records.length,
      };

      records.forEach((record) => {
        if (record.status === "Hadir") {
          if (
            record.checkIn &&
            isLateCheckIn(record.checkIn, workStartTime)
          ) {
            row.late += 1;
          } else {
            row.present += 1;
          }
          return;
        }

        if (record.status === "Izin") row.leave += 1;
        if (record.status === "Sakit") row.sick += 1;
        if (record.status === "Alpa") row.absent += 1;
      });

      return row;
    })
    .sort((first, second) => first.employeeName.localeCompare(second.employeeName));
}

export function formatMonthValue(date: Date): string {
  return toDateInputValue(date).slice(0, 7);
}

export function formatMonthLabel(month: string): string {
  return formatMonthYear(new Date(`${month}-01T00:00:00`));
}
