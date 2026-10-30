"use client";

import { ROLE_PERMISSIONS } from "@/config/permissions";
import {
  appendActivity,
  createId,
} from "@/lib/store/activity";
import {
  getDatabase,
  updateDatabase,
  useHydratedDatabase,
} from "@/lib/store/store";
import type {
  AppDatabase,
  AttendanceRecord,
  Employee,
  LeaveRequestStatus,
} from "@/lib/store/types";
import { toDateInputValue } from "@/lib/date-range";
import { formatDateShort, formatTime } from "@/lib/format";
import { isLateCheckIn } from "@/features/absensi/data/absensi-calculations";
import type { CheckInResult } from "@/features/absensi/types";

export function useAbsensiData(): AppDatabase | null {
  return useHydratedDatabase();
}

function requireActor(database: AppDatabase): Employee {
  const actor = database.employees.find(
    (employee) => employee.id === database.session.currentEmployeeId,
  );

  if (!actor) throw new Error("Karyawan aktif tidak ditemukan");
  return actor;
}

export function checkIn(): CheckInResult {
  const now = new Date();
  const date = toDateInputValue(now);
  const time = formatTime(now);
  const late = isLateCheckIn(
    time,
    getDatabase().settings.attendance.workStartTime,
  );

  updateDatabase((database) => {
    const actor = requireActor(database);
    const existing = database.attendance.find(
      (record) => record.employeeId === actor.id && record.date === date,
    );

    if (existing?.checkIn) {
      throw new Error("Kamu sudah absen masuk hari ini");
    }

    const record: AttendanceRecord = existing
      ? { ...existing, branchId: database.session.activeBranchId, checkIn: time }
      : {
          id: createId("att"),
          employeeId: actor.id,
          branchId: database.session.activeBranchId,
          date,
          status: "Hadir",
          checkIn: time,
        };

    const attendance = existing
      ? database.attendance.map((entry) =>
          entry.id === existing.id ? record : entry,
        )
      : [record, ...database.attendance];

    return appendActivity(
      { ...database, attendance },
      {
        action: "Membuat",
        detail: `Absen masuk ${time}${late ? " · Telat" : ""}`,
      },
    );
  });

  return { time, late };
}

export function checkOut(): string {
  const now = new Date();
  const date = toDateInputValue(now);
  const time = formatTime(now);

  updateDatabase((database) => {
    const actor = requireActor(database);
    const existing = database.attendance.find(
      (record) => record.employeeId === actor.id && record.date === date,
    );

    if (!existing?.checkIn) {
      throw new Error("Absen masuk dulu sebelum pulang");
    }
    if (existing.checkOut) {
      throw new Error("Kamu sudah absen pulang hari ini");
    }

    return appendActivity(
      {
        ...database,
        attendance: database.attendance.map((record) =>
          record.id === existing.id ? { ...record, checkOut: time } : record,
        ),
      },
      { action: "Mengubah", detail: `Absen pulang ${time}` },
    );
  });

  return time;
}

export function submitLeaveRequest(input: {
  date: string;
  reason: string;
}): void {
  const date = input.date;
  const reason = input.reason.trim();

  if (!date) throw new Error("Tanggal izin wajib diisi");
  if (reason.length < 3) throw new Error("Alasan minimal 3 karakter");
  if (date < toDateInputValue(new Date())) {
    throw new Error("Tanggal izin tidak boleh di masa lalu");
  }

  updateDatabase((database) => {
    const actor = requireActor(database);
    const duplicate = database.leaveRequests.some(
      (request) =>
        request.employeeId === actor.id &&
        request.date === date &&
        request.status !== "Ditolak",
    );

    if (duplicate) {
      throw new Error("Sudah ada pengajuan izin untuk tanggal itu");
    }

    return appendActivity(
      {
        ...database,
        leaveRequests: [
          {
            id: createId("leave"),
            employeeId: actor.id,
            branchId: actor.branchId,
            date,
            reason,
            status: "Menunggu",
            createdAt: new Date().toISOString(),
          },
          ...database.leaveRequests,
        ],
      },
      {
        action: "Membuat",
        detail: `Pengajuan izin ${formatDateShort(date)} · ${reason}`,
      },
    );
  });
}

export function reviewLeaveRequest(
  requestId: string,
  status: Exclude<LeaveRequestStatus, "Menunggu">,
): void {
  updateDatabase((database) => {
    const actor = requireActor(database);

    if (!ROLE_PERMISSIONS[actor.role].canApproveLeave) {
      throw new Error("Role ini tidak bisa menyetujui izin");
    }

    const request = database.leaveRequests.find(
      (entry) => entry.id === requestId,
    );

    if (!request) throw new Error("Pengajuan izin tidak ditemukan");
    if (request.status !== "Menunggu") {
      throw new Error("Pengajuan ini sudah diproses");
    }

    let attendance = database.attendance;

    // Izin disetujui langsung dicatat sebagai absensi agar rekap ikut terhitung.
    if (status === "Disetujui") {
      const existing = attendance.find(
        (record) =>
          record.employeeId === request.employeeId &&
          record.date === request.date,
      );

      if (!existing) {
        attendance = [
          {
            id: createId("att"),
            employeeId: request.employeeId,
            branchId: request.branchId,
            date: request.date,
            status: "Izin",
          },
          ...attendance,
        ];
      }
    }

    const employeeName =
      database.employees.find(
        (employee) => employee.id === request.employeeId,
      )?.name ?? "Karyawan";

    return appendActivity(
      {
        ...database,
        attendance,
        leaveRequests: database.leaveRequests.map((entry) =>
          entry.id === requestId
            ? {
                ...entry,
                status,
                reviewedBy: actor.id,
                reviewedAt: new Date().toISOString(),
              }
            : entry,
        ),
      },
      {
        action: "Mengubah",
        detail: `Izin ${employeeName} ${formatDateShort(request.date)} ${status.toLowerCase()}`,
      },
    );
  });
}
