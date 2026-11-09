"use server";

import { getAuthorizedSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import type {
  AttendanceRecord,
  AttendanceStatus,
  LeaveRequest,
  LeaveRequestStatus,
} from "@/lib/store/types";
import type { AttendanceDataResult } from "@/lib/cloud/attendance-types";

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

export async function checkInAction(
  date: string,
  time: string,
): Promise<AttendanceDataResult<AttendanceRecord>> {
  const session = await getAuthorizedSession("canAccessAttendance");
  if (!session) return fail("Role ini tidak punya akses absensi");

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
  const session = await getAuthorizedSession("canAccessAttendance");
  if (!session) return fail("Role ini tidak punya akses absensi");

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
  const session = await getAuthorizedSession("canAccessAttendance");
  if (!session) return fail("Role ini tidak punya akses absensi");

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
