"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  DateRangePicker,
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ActivityLogTable } from "@/features/laporan/components/ActivityLogTable";
import { BestSellersCard } from "@/features/laporan/components/BestSellersCard";
import { CashierReportCard } from "@/features/laporan/components/CashierReportCard";
import { PaymentMethodCard } from "@/features/laporan/components/PaymentMethodCard";
import { ReportPrintSheet } from "@/features/laporan/components/ReportPrintSheet";
import { ReportStatsCards } from "@/features/laporan/components/ReportStatsCards";
import { SalesSourceCard } from "@/features/laporan/components/SalesSourceCard";
import {
  buildLogUsers,
  buildReportData,
} from "@/features/laporan/data/laporan-calculations";
import { exportReportExcel } from "@/features/laporan/data/laporan-excel";
import { useLaporanData } from "@/features/laporan/data/laporan-repository";
import {
  usePermissions,
  useSession,
} from "@/features/session/data/session-repository";
import type { Role } from "@/constants/roles";
import {
  resolveDateRange,
  toDateInputValue,
} from "@/lib/date-range";
import type { AppDatabase, Branch } from "@/lib/store/types";

/**
 * Tanggal sengaja kosong di state awal: `new Date()` tidak boleh dibaca saat
 * prerender (Cache Components Next 16). Nilai diisi setelah store ter-hydrate.
 */
const INITIAL_RANGE: DateRangeValue = { preset: "month", start: "", end: "" };

export function LaporanPageContent() {
  const database = useLaporanData();
  const { branch, branches } = useSession();
  const permissions = usePermissions();
  const { showToast } = useToast();
  const [range, setRange] = useState<DateRangeValue>(INITIAL_RANGE);
  const [branchId, setBranchId] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  const logUsers = useMemo(
    () => (database ? buildLogUsers(database) : []),
    [database],
  );

  const usersForRole =
    roleFilter === "all"
      ? logUsers
      : logUsers.filter((user) => user.role === roleFilter);

  // User yang tidak lagi cocok dengan filter role diabaikan, bukan error.
  const effectiveUserFilter =
    userFilter !== "all" && usersForRole.some((user) => user.id === userFilter)
      ? userFilter
      : "all";

  if (!database) {
    return (
      <>
        <PageHeader title="Laporan" subtitle="Memuat data laporan…" />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-body text-ink-muted">
            Menyiapkan data…
          </div>
        </div>
      </>
    );
  }

  return (
    <LaporanBody
      database={database}
      branch={branch}
      branches={branches}
      canViewAllBranches={permissions.canViewAllBranches}
      canExport={permissions.canExportReports}
      range={range}
      onRangeChange={setRange}
      branchId={branchId}
      onBranchChange={setBranchId}
      roleFilter={roleFilter}
      onRoleChange={(role) => {
        setRoleFilter(role);
        setUserFilter("all");
      }}
      userFilter={effectiveUserFilter}
      onUserChange={setUserFilter}
      usersForRole={usersForRole}
      onNotify={showToast}
    />
  );
}

interface LaporanBodyProps {
  database: AppDatabase;
  branch: Branch;
  branches: Branch[];
  canViewAllBranches: boolean;
  canExport: boolean;
  range: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
  branchId: string;
  onBranchChange: (branchId: string) => void;
  roleFilter: Role | "all";
  onRoleChange: (role: Role | "all") => void;
  userFilter: string;
  onUserChange: (userId: string) => void;
  usersForRole: ReturnType<typeof buildLogUsers>;
  onNotify: (message: string, tone?: "success" | "error" | "info") => void;
}

function LaporanBody({
  database,
  branch,
  branches,
  canViewAllBranches,
  canExport,
  range,
  onRangeChange,
  branchId,
  onBranchChange,
  roleFilter,
  onRoleChange,
  userFilter,
  onUserChange,
  usersForRole,
  onNotify,
}: LaporanBodyProps) {
  const branchScope = canViewAllBranches ? branchId : branch.id;
  // Aman dibaca di sini karena body baru dirender setelah store ter-hydrate.
  const todayInput = toDateInputValue(new Date());

  const data = useMemo(
    () =>
      buildReportData(
        database,
        resolveDateRange(range, new Date()),
        branchScope,
        roleFilter,
        userFilter,
      ),
    [database, range, branchScope, roleFilter, userFilter],
  );

  async function handleExportExcel() {
    try {
      await exportReportExcel(data);
      onNotify("File Excel laporan berhasil dibuat", "success");
    } catch {
      onNotify("Export Excel gagal, coba lagi", "error");
    }
  }

  function handlePrint() {
    onNotify("Menyiapkan versi cetak laporan", "info");
    window.print();
  }

  return (
    <>
      <PageHeader
        title={data.header.title}
        subtitle={data.header.subtitle}
        actions={
          <>
            <DateRangePicker
              value={range}
              onChange={onRangeChange}
              defaultDate={todayInput}
            />
            {canViewAllBranches ? (
              <Select
                aria-label="Filter cabang laporan"
                value={branchId}
                onChange={(event) => onBranchChange(event.target.value)}
                className="h-[38px] w-auto max-w-[170px] text-label"
              >
                <option value="all">Semua Cabang</option>
                {branches.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            ) : null}
            {canExport ? (
              <>
                <Button variant="outline" size="md" onClick={handleExportExcel}>
                  Export Excel
                </Button>
                <Button variant="outline" size="md" onClick={handlePrint}>
                  Export PDF
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        <ReportStatsCards stats={data.stats} />

        <div className="flex flex-wrap gap-4">
          <PaymentMethodCard breakdown={data.paymentBreakdown} />
          <CashierReportCard
            cashiers={data.cashiers}
            cashDifference={data.cashDifference}
          />
          <BestSellersCard bestSellers={data.bestSellers} />
        </div>

        <SalesSourceCard breakdown={data.sourceBreakdown} />

        <ActivityLogTable
          logs={data.activityLog}
          roles={data.roles}
          users={usersForRole}
          roleFilter={roleFilter}
          userFilter={userFilter}
          onRoleChange={onRoleChange}
          onUserChange={onUserChange}
        />
      </div>

      <ReportPrintSheet data={data} business={database.settings.business} />
    </>
  );
}
