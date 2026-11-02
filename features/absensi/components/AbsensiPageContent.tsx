"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { AttendanceClockCard } from "@/features/absensi/components/AttendanceClockCard";
import { AttendanceStatsCards } from "@/features/absensi/components/AttendanceStatsCards";
import { DailyAttendanceTable } from "@/features/absensi/components/DailyAttendanceTable";
import { LeaveRequestPanel } from "@/features/absensi/components/LeaveRequestPanel";
import { MonthlyRecapTable } from "@/features/absensi/components/MonthlyRecapTable";
import {
  buildDailyRows,
  buildLeaveRows,
  buildMonthlyRecap,
  calculateAttendanceStats,
  formatMonthLabel,
  resolveDisplayStatus,
} from "@/features/absensi/data/absensi-calculations";
import {
  checkIn,
  checkOut,
  useAbsensiData,
} from "@/features/absensi/data/absensi-repository";
import { exportMonthlyRecapExcel } from "@/features/absensi/data/absensi-excel";
import {
  usePermissions,
  useSession,
} from "@/features/session/data/session-repository";
import { toDateInputValue } from "@/lib/date-range";
import { formatDateLong } from "@/lib/format";
import type { AppDatabase, Branch, Employee } from "@/lib/store/types";

export function AbsensiPageContent() {
  const database = useAbsensiData();
  const { employee, branch, branches } = useSession();
  const permissions = usePermissions();
  const { showToast } = useToast();
  const [dateInput, setDateInput] = useState("");
  const [monthInput, setMonthInput] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  if (!database) {
    return (
      <>
        <PageHeader title="Absensi" subtitle="Memuat data kehadiran…" />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-body text-ink-muted">
            Menyiapkan data…
          </div>
        </div>
      </>
    );
  }

  return (
    <AbsensiBody
      database={database}
      employee={employee}
      branch={branch}
      branches={branches}
      canViewAll={permissions.canViewAllAttendance}
      canApprove={permissions.canApproveLeave}
      dateInput={dateInput}
      onDateChange={setDateInput}
      monthInput={monthInput}
      onMonthChange={setMonthInput}
      branchFilter={branchFilter}
      onBranchChange={setBranchFilter}
      onNotify={showToast}
    />
  );
}

interface AbsensiBodyProps {
  database: AppDatabase;
  employee: Employee;
  branch: Branch;
  branches: Branch[];
  canViewAll: boolean;
  canApprove: boolean;
  dateInput: string;
  onDateChange: (date: string) => void;
  monthInput: string;
  onMonthChange: (month: string) => void;
  branchFilter: string;
  onBranchChange: (branchId: string) => void;
  onNotify: (message: string, tone?: "success" | "error" | "info") => void;
}

function AbsensiBody({
  database,
  employee,
  branch,
  branches,
  canViewAll,
  canApprove,
  dateInput,
  onDateChange,
  monthInput,
  onMonthChange,
  branchFilter,
  onBranchChange,
  onNotify,
}: AbsensiBodyProps) {
  const [busy, setBusy] = useState(false);
  const today = toDateInputValue(new Date());
  const activeDate = dateInput || today;
  const activeMonth = monthInput || today.slice(0, 7);
  const branchScope = canViewAll ? branchFilter || branch.id : branch.id;
  const scope = { canViewAll, viewerEmployeeId: employee.id };

  const dailyRows = buildDailyRows(
    database,
    activeDate,
    branchScope,
    scope,
    today,
  );
  const stats = calculateAttendanceStats(dailyRows);
  const leaveRows = buildLeaveRows(database, branchScope, scope);
  const recapRows = buildMonthlyRecap(database, activeMonth, branchScope, scope);

  const ownRecord = database.attendance.find(
    (record) => record.employeeId === employee.id && record.date === today,
  );
  const ownStatus = resolveDisplayStatus(
    ownRecord,
    database.settings.attendance.workStartTime,
    today,
    today,
  );

  const branchLabel =
    branchScope === "all"
      ? "Semua cabang"
      : (branches.find((item) => item.id === branchScope)?.name ?? branch.name);

  async function handleCheckIn() {
    if (busy) return;
    setBusy(true);

    try {
      const result = await checkIn();
      onNotify(
        result.late
          ? `Absen masuk ${result.time} · Telat`
          : `Absen masuk ${result.time} · Tepat waktu`,
        result.late ? "info" : "success",
      );
    } catch (caught) {
      onNotify(
        caught instanceof Error ? caught.message : "Absen masuk gagal",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut() {
    if (busy) return;
    setBusy(true);

    try {
      const time = await checkOut();
      onNotify(`Absen pulang ${time}`, "success");
    } catch (caught) {
      onNotify(
        caught instanceof Error ? caught.message : "Absen pulang gagal",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    try {
      await exportMonthlyRecapExcel(recapRows, formatMonthLabel(activeMonth));
      onNotify("Rekap absensi berhasil diexport", "success");
    } catch {
      onNotify("Export rekap gagal, coba lagi", "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Absensi"
        subtitle={`${formatDateLong(activeDate)} · ${branchLabel}`}
        actions={
          <>
            {canViewAll ? (
              <Select
                aria-label="Filter cabang absensi"
                value={branchFilter || branch.id}
                onChange={(event) => onBranchChange(event.target.value)}
                className="h-10 w-auto max-w-[180px] text-label"
              >
                <option value="all">Semua cabang</option>
                {branches.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            ) : null}
            <Chip tone="neutral">
              Jam kerja {database.settings.attendance.workStartTime} –{" "}
              {database.settings.attendance.workEndTime}
            </Chip>
          </>
        }
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        <AttendanceStatsCards stats={stats} />

        <div className="flex flex-wrap items-start gap-4">
          <AttendanceClockCard
            employeeName={employee.name}
            branchName={branch.name}
            workStartTime={database.settings.attendance.workStartTime}
            workEndTime={database.settings.attendance.workEndTime}
            status={ownStatus}
            checkIn={ownRecord?.checkIn ?? null}
            checkOut={ownRecord?.checkOut ?? null}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
          />
          <LeaveRequestPanel
            rows={leaveRows}
            canApprove={canApprove}
            today={today}
          />
        </div>

        <DailyAttendanceTable
          rows={dailyRows}
          date={activeDate}
          onDateChange={onDateChange}
          branches={branches}
          branchId={branchFilter || branch.id}
          onBranchChange={onBranchChange}
          canFilterBranch={canViewAll}
          title={canViewAll ? "Kehadiran Harian" : "Absensi Saya"}
        />

        <MonthlyRecapTable
          rows={recapRows}
          month={activeMonth}
          onMonthChange={onMonthChange}
          onExport={handleExport}
        />
      </div>
    </>
  );
}
