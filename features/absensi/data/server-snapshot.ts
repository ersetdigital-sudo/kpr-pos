import "server-only";

import { syncWindowStartDate } from "@/lib/cloud/window";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SessionState } from "@/features/session/types";
import type {
  AttendanceRecord,
  AttendanceStatus,
  LeaveRequest,
  LeaveRequestStatus,
} from "@/lib/store/types";
import type { AttendanceSnapshot } from "@/lib/cloud/attendance-types";

interface AttendanceRow {
  id: string;
  employee_id: string;
  branch_id: string;
  date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
}

interface LeaveRow {
  id: string;
  employee_id: string;
  branch_id: string;
  date: string;
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export function mapAttendanceRow(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    branchId: row.branch_id,
    date: row.date,
    status: row.status as AttendanceStatus,
    checkIn: row.check_in?.slice(0, 5) ?? undefined,
    checkOut: row.check_out?.slice(0, 5) ?? undefined,
  };
}

export function mapLeaveRow(row: LeaveRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    branchId: row.branch_id,
    date: row.date,
    reason: row.reason,
    status: row.status as LeaveRequestStatus,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at,
  };
}

export async function readAttendance(
  session: SessionState,
  options: { start?: string; end?: string; branchId?: string } = {},
): Promise<AttendanceRecord[]> {
  const admin = createSupabaseAdminClient();

  let request = admin
    .from("attendance")
    .select("id,employee_id,branch_id,date,status,check_in,check_out")
    .gte("date", options.start ?? syncWindowStartDate())
    .order("date", { ascending: false });

  if (options.end) request = request.lte("date", options.end);
  if (!session.permissions.canViewAllAttendance) {
    request = request.eq("employee_id", session.employee.id);
  } else if (options.branchId) {
    request = request.eq("branch_id", options.branchId);
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message);

  return ((data ?? []) as AttendanceRow[]).map(mapAttendanceRow);
}

export async function readLeaveRequests(
  session: SessionState,
  options: { start?: string; end?: string; branchId?: string } = {},
): Promise<LeaveRequest[]> {
  const admin = createSupabaseAdminClient();

  let request = admin
    .from("leave_requests")
    .select(
      "id,employee_id,branch_id,date,reason,status,reviewed_by,reviewed_at,created_at",
    )
    .gte("date", options.start ?? syncWindowStartDate())
    .order("created_at", { ascending: false });

  if (options.end) request = request.lte("date", options.end);
  if (!session.permissions.canApproveLeave) {
    request = request.eq("employee_id", session.employee.id);
  } else if (options.branchId) {
    request = request.eq("branch_id", options.branchId);
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message);

  return ((data ?? []) as LeaveRow[]).map(mapLeaveRow);
}

export async function readAttendanceSnapshot(
  session: SessionState,
): Promise<AttendanceSnapshot> {
  const [attendance, leaveRequests] = await Promise.all([
    readAttendance(session),
    readLeaveRequests(session),
  ]);

  return {
    attendance,
    leaveRequests,
    isEmpty: attendance.length === 0 && leaveRequests.length === 0,
  };
}
