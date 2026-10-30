import type { AttendanceDisplayStatus, LeaveRequestStatus } from "@/lib/store/types";
import type { Role } from "@/constants/roles";

export interface AttendanceRow {
  recordId: string | null;
  employeeId: string;
  employeeName: string;
  initials: string;
  role: Role;
  branchName: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceDisplayStatus;
}

export interface AttendanceStats {
  present: number;
  late: number;
  leave: number;
  sick: number;
  absent: number;
  notCheckedIn: number;
}

export interface LeaveRequestRow {
  id: string;
  employeeId: string;
  employeeName: string;
  initials: string;
  branchName: string;
  date: string;
  reason: string;
  status: LeaveRequestStatus;
  reviewedByName: string | null;
  createdAt: string;
}

export interface MonthlyRecapRow {
  employeeId: string;
  employeeName: string;
  role: Role;
  branchName: string;
  /** Hadir tepat waktu. */
  present: number;
  late: number;
  leave: number;
  sick: number;
  absent: number;
  totalDays: number;
}

export interface AttendanceScope {
  canViewAll: boolean;
  viewerEmployeeId: string;
}

export interface CheckInResult {
  time: string;
  late: boolean;
}
