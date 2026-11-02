"use client";

import { recordActivity } from "@/lib/store/activity";
import { getDatabase, useHydratedDatabase } from "@/lib/store/store";
import type { AppDatabase, LeaveRequestStatus } from "@/lib/store/types";
import { toDateInputValue } from "@/lib/date-range";
import { formatDateShort, formatTime } from "@/lib/format";
import { isLateCheckIn } from "@/features/absensi/data/absensi-calculations";
import { syncAttendanceFromCloud } from "@/features/absensi/data/attendance-cloud";
import {
  checkInAction,
  checkOutAction,
  reviewLeaveAction,
  submitLeaveAction,
} from "@/features/absensi/cloud-actions";
import type { CheckInResult } from "@/features/absensi/types";

export function useAbsensiData(): AppDatabase | null {
  return useHydratedDatabase();
}

async function refreshAttendance(): Promise<void> {
  try {
    await syncAttendanceFromCloud({ force: true });
  } catch (error) {
    console.error("Sinkronisasi absensi gagal:", error);
  }
}

export async function checkIn(): Promise<CheckInResult> {
  const now = new Date();
  const date = toDateInputValue(now);
  const time = formatTime(now);
  const late = isLateCheckIn(
    time,
    getDatabase().settings.attendance.workStartTime,
  );

  const result = await checkInAction(date, time);
  if (!result.ok) throw new Error(result.error);

  await refreshAttendance();
  recordActivity({
    action: "Membuat",
    detail: `Absen masuk ${time}${late ? " · Telat" : ""}`,
  });

  return { time, late };
}

export async function checkOut(): Promise<string> {
  const now = new Date();
  const date = toDateInputValue(now);
  const time = formatTime(now);

  const result = await checkOutAction(date, time);
  if (!result.ok) throw new Error(result.error);

  await refreshAttendance();
  recordActivity({ action: "Mengubah", detail: `Absen pulang ${time}` });

  return time;
}

export async function submitLeaveRequest(input: {
  date: string;
  reason: string;
}): Promise<void> {
  const date = input.date;
  const reason = input.reason.trim();

  if (!date) throw new Error("Tanggal izin wajib diisi");
  if (reason.length < 3) throw new Error("Alasan minimal 3 karakter");
  if (date < toDateInputValue(new Date())) {
    throw new Error("Tanggal izin tidak boleh di masa lalu");
  }

  const result = await submitLeaveAction(date, reason);
  if (!result.ok) throw new Error(result.error);

  await refreshAttendance();
  recordActivity({
    action: "Membuat",
    detail: `Pengajuan izin ${formatDateShort(date)} · ${reason}`,
  });
}

export async function reviewLeaveRequest(
  requestId: string,
  status: Exclude<LeaveRequestStatus, "Menunggu">,
): Promise<void> {
  const database = getDatabase();
  const request = database.leaveRequests.find((entry) => entry.id === requestId);
  if (!request) throw new Error("Pengajuan izin tidak ditemukan");
  if (request.status !== "Menunggu") {
    throw new Error("Pengajuan ini sudah diproses");
  }

  const result = await reviewLeaveAction(requestId, status);
  if (!result.ok) throw new Error(result.error);

  await refreshAttendance();

  const employeeName =
    database.employees.find(
      (employee) => employee.id === request.employeeId,
    )?.name ?? "Karyawan";

  recordActivity({
    action: "Mengubah",
    detail: `Izin ${employeeName} ${formatDateShort(request.date)} ${status.toLowerCase()}`,
  });
}
