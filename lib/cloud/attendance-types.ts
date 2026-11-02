import type {
  ActivityLog,
  AttendanceRecord,
  Branch,
  Employee,
  LeaveRequest,
  LeaveRequestStatus,
} from "@/lib/store/types";

export interface AttendanceSnapshot {
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  isEmpty: boolean;
}

export interface AttendanceBootstrapPayload {
  branches: {
    id: string;
    name: string;
    address: string;
    phone: string;
    is_active: boolean;
  }[];
  employees: {
    id: string;
    name: string;
    phone: string;
    initials: string;
    role: string;
    branch_id: string;
    is_active: boolean;
  }[];
  attendance: {
    id: string;
    employee_id: string;
    branch_id: string;
    date: string;
    status: string;
    check_in: string | null;
    check_out: string | null;
  }[];
  leave_requests: {
    id: string;
    employee_id: string;
    branch_id: string;
    date: string;
    reason: string;
    status: LeaveRequestStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
  }[];
}

export interface AttendanceBootstrapInput {
  branches: Branch[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
}

export interface ActivitySnapshot {
  activityLogs: ActivityLog[];
  isEmpty: boolean;
}

export interface ActivityBootstrapPayload {
  activity_logs: {
    id: string;
    at: string;
    user_id: string;
    user_name: string;
    role: string;
    branch_id: string;
    action: string;
    detail: string;
  }[];
}

export type AttendanceDataResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
