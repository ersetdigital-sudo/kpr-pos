"use server";

import { getAuthSession, getAuthorizedSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CloudBootstrapResult } from "@/lib/cloud/result";
import type {
  AttendanceRecord,
  AttendanceStatus,
  LeaveRequest,
  LeaveRequestStatus,
} from "@/lib/store/types";
import type {
  AttendanceBootstrapPayload,
  AttendanceDataResult,
  AttendanceSnapshot,
} from "@/lib/cloud/attendance-types";
import type { SessionState } from "@/features/session/types";

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

interface AttendanceJson {
  id: string;
  employeeId: string;
  branchId: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
}

interface LeaveJson {
  id: string;
  employeeId: string;
  branchId: string;
  date: string;
  reason: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

function fail(message: string): { ok: false; error: string } {
  return { ok: false, error: message };
}

function mapAttendance(row: AttendanceRow): AttendanceRecord {
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

function mapLeave(row: LeaveRow): LeaveRequest {
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

function mapAttendanceJson(row: AttendanceJson): AttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employeeId,
    branchId: row.branchId,
    date: row.date,
    status: row.status as AttendanceStatus,
    checkIn: row.checkIn ?? undefined,
    checkOut: row.checkOut ?? undefined,
  };
}

function mapLeaveJson(row: LeaveJson): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employeeId,
    branchId: row.branchId,
    date: row.date,
    reason: row.reason,
    status: row.status as LeaveRequestStatus,
    reviewedBy: row.reviewedBy ?? undefined,
    reviewedAt: row.reviewedAt ?? undefined,
    createdAt: row.createdAt,
  };
}

async function readSnapshot(session: SessionState): Promise<AttendanceSnapshot> {
  const admin = createSupabaseAdminClient();
  const permissions = session.permissions;

  const [attendanceResult, leaveResult] = await Promise.all([
    admin
      .from("attendance")
      .select("id,employee_id,branch_id,date,status,check_in,check_out")
      .order("date", { ascending: false }),
    admin
      .from("leave_requests")
      .select("id,employee_id,branch_id,date,reason,status,reviewed_by,reviewed_at,created_at")
      .order("created_at", { ascending: false }),
  ]);

  const error = attendanceResult.error ?? leaveResult.error;
  if (error) throw new Error(error.message);

  const attendance = ((attendanceResult.data ?? []) as AttendanceRow[])
    .filter(
      (row) =>
        permissions.canViewAllAttendance ||
        row.employee_id === session.employee.id,
    )
    .map(mapAttendance);

  const leaveRequests = ((leaveResult.data ?? []) as LeaveRow[])
    .filter(
      (row) =>
        permissions.canApproveLeave ||
        row.employee_id === session.employee.id,
    )
    .map(mapLeave);

  return {
    attendance,
    leaveRequests,
    isEmpty: attendance.length === 0 && leaveRequests.length === 0,
  };
}

export async function fetchAttendanceSnapshotAction(): Promise<AttendanceSnapshot> {
  const session = await getAuthSession();
  if (!session) throw new Error("Sesi pengguna tidak ditemukan");
  return readSnapshot(session);
}

export async function bootstrapAttendanceAction(
  payload: AttendanceBootstrapPayload,
): Promise<CloudBootstrapResult> {
  const session = await getAuthorizedSession("canViewAllAttendance");
  if (!session) {
    return { ok: false, error: "Anda tidak punya akses memindahkan absensi." };
  }

  const result = await callServiceRpc<boolean>("fn_bootstrap_attendance", {
    p_payload: payload,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, bootstrapped: result.data === true };
}

export async function checkInAction(
  date: string,
  time: string,
): Promise<AttendanceDataResult<AttendanceRecord>> {
  const session = await getAuthSession();
  if (!session) return fail("Sesi pengguna tidak ditemukan");

  const result = await callServiceRpc<AttendanceJson>("fn_check_in", {
    p_employee_id: session.employee.id,
    p_branch_id: session.branch.id,
    p_date: date,
    p_time: time,
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Absen masuk gagal" : result.error);
  }

  return { ok: true, data: mapAttendanceJson(result.data) };
}

export async function checkOutAction(
  date: string,
  time: string,
): Promise<AttendanceDataResult<AttendanceRecord>> {
  const session = await getAuthSession();
  if (!session) return fail("Sesi pengguna tidak ditemukan");

  const result = await callServiceRpc<AttendanceJson>("fn_check_out", {
    p_employee_id: session.employee.id,
    p_date: date,
    p_time: time,
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Absen pulang gagal" : result.error);
  }

  return { ok: true, data: mapAttendanceJson(result.data) };
}

export async function submitLeaveAction(
  date: string,
  reason: string,
): Promise<AttendanceDataResult<LeaveRequest>> {
  const session = await getAuthSession();
  if (!session) return fail("Sesi pengguna tidak ditemukan");

  const result = await callServiceRpc<LeaveJson>("fn_submit_leave_request", {
    p_employee_id: session.employee.id,
    p_date: date,
    p_reason: reason,
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Pengajuan izin gagal" : result.error);
  }

  return { ok: true, data: mapLeaveJson(result.data) };
}

export async function reviewLeaveAction(
  requestId: string,
  status: Exclude<LeaveRequestStatus, "Menunggu">,
): Promise<AttendanceDataResult<LeaveRequest>> {
  const session = await getAuthorizedSession("canApproveLeave");
  if (!session) return fail("Role ini tidak bisa menyetujui izin");

  const result = await callServiceRpc<LeaveJson>("fn_review_leave_request", {
    p_request_id: requestId,
    p_status: status,
    p_reviewer_id: session.employee.id,
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Pengajuan gagal diproses" : result.error);
  }

  return { ok: true, data: mapLeaveJson(result.data) };
}
