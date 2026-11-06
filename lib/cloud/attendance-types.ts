import type {
  ActivityLog,
  AttendanceRecord,
  LeaveRequest,
} from "@/lib/store/types";

export interface AttendanceSnapshot {
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  isEmpty: boolean;
}

export interface ActivitySnapshot {
  activityLogs: ActivityLog[];
  isEmpty: boolean;
}

export type AttendanceDataResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
