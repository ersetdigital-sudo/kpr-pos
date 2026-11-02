import {
  bootstrapAttendanceAction,
  fetchAttendanceSnapshotAction,
} from "@/features/absensi/cloud-actions";
import {
  getDatabase,
  hasStoredDatabase,
  updateDatabase,
} from "@/lib/store/store";
import type { AppDatabase } from "@/lib/store/types";
import type {
  AttendanceBootstrapPayload,
  AttendanceSnapshot,
} from "@/lib/cloud/attendance-types";

let inFlight: Promise<{ bootstrapped: boolean }> | null = null;

function buildBootstrapPayload(
  database: AppDatabase,
): AttendanceBootstrapPayload {
  return {
    branches: database.branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      is_active: branch.isActive,
    })),
    employees: database.employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      phone: employee.phone,
      initials: employee.initials,
      role: employee.role,
      branch_id: employee.branchId,
      is_active: employee.isActive,
    })),
    attendance: database.attendance.map((record) => ({
      id: record.id,
      employee_id: record.employeeId,
      branch_id: record.branchId,
      date: record.date,
      status: record.status,
      check_in: record.checkIn ?? null,
      check_out: record.checkOut ?? null,
    })),
    leave_requests: database.leaveRequests.map((request) => ({
      id: request.id,
      employee_id: request.employeeId,
      branch_id: request.branchId,
      date: request.date,
      reason: request.reason,
      status: request.status,
      reviewed_by: request.reviewedBy ?? null,
      reviewed_at: request.reviewedAt ?? null,
      created_at: request.createdAt,
    })),
  };
}

function applySnapshot(snapshot: AttendanceSnapshot): void {
  updateDatabase((database) => ({
    ...database,
    attendance: snapshot.attendance,
    leaveRequests: snapshot.leaveRequests,
  }));
}

interface SyncOptions {
  canBootstrap?: boolean;
  force?: boolean;
}

export function syncAttendanceFromCloud(
  options: SyncOptions = {},
): Promise<{ bootstrapped: boolean }> {
  if (inFlight) {
    if (!options.force) return inFlight;

    return inFlight
      .catch(() => undefined)
      .then(() => syncAttendanceFromCloud({ ...options, force: false }));
  }

  inFlight = (async () => {
    let snapshot = await fetchAttendanceSnapshotAction();
    let bootstrapped = false;

    if (snapshot.isEmpty) {
      const database = getDatabase();
      const stored = hasStoredDatabase();
      const hasLocalData =
        database.attendance.length > 0 ||
        database.leaveRequests.length > 0;

      if (options.canBootstrap && stored && hasLocalData) {
        const result = await bootstrapAttendanceAction(
          buildBootstrapPayload(database),
        );
        if (!result.ok) throw new Error(result.error);
        bootstrapped = result.bootstrapped;
        snapshot = await fetchAttendanceSnapshotAction();
      } else if (!stored) {
        applySnapshot(snapshot);
      }
    }

    if (!snapshot.isEmpty) applySnapshot(snapshot);
    return { bootstrapped };
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
