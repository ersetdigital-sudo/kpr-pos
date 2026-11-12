"use client";

import { useState } from "react";
import { DashboardCard } from "@/features/dashboard/components/DashboardCard";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardStats } from "@/features/dashboard/components/DashboardStats";
import { LowStockCard } from "@/features/dashboard/components/LowStockCard";
import { RecentTransactionsCard } from "@/features/dashboard/components/RecentTransactionsCard";
import { TopSalesCard } from "@/features/dashboard/components/TopSalesCard";
import { WeeklySalesCard } from "@/features/dashboard/components/WeeklySalesCard";
import { buildDashboardData } from "@/features/dashboard/data/dashboard-calculations";
import { useDashboardData } from "@/features/dashboard/data/dashboard-repository";
import type { DashboardScope } from "@/features/dashboard/types";
import {
  usePermissions,
  useSession,
  useSetActiveBranch,
} from "@/features/session/data/session-repository";
import type { AppDatabase, Branch } from "@/lib/store/types";

export function DashboardPageContent() {
  const database = useDashboardData();
  const { branch, branches, isOwner } = useSession();
  const permissions = usePermissions();
  const setActiveBranch = useSetActiveBranch();
  const [scope, setScope] = useState<DashboardScope>("all");

  const effectiveScope: DashboardScope = permissions.canViewAllBranches
    ? scope === "all" ||
      branches.some((candidate) => candidate.id === scope)
      ? scope
      : "all"
    : branch.id;

  if (!database) {
    return (
      <>
        <DashboardHeader
          title="Dashboard"
          subtitle="Memuat ringkasan…"
          scope={effectiveScope}
          onScopeChange={setScope}
          branches={branches}
          canViewAllBranches={permissions.canViewAllBranches}
          branchName={branch.name}
          isOwner={isOwner}
          activeBranchId={branch.id}
          onActiveBranchChange={setActiveBranch}
        />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <DashboardCard className="px-4 py-12 text-center text-body text-ink-muted">
            Menyiapkan data…
          </DashboardCard>
        </div>
      </>
    );
  }

  return (
    <DashboardBody
      database={database}
      branches={branches}
      scope={effectiveScope}
      onScopeChange={setScope}
      canViewAllBranches={permissions.canViewAllBranches}
      branchName={branch.name}
      activeBranchId={branch.id}
      onActiveBranchChange={setActiveBranch}
      isOwner={isOwner}
    />
  );
}

interface DashboardBodyProps {
  database: AppDatabase;
  branches: Branch[];
  scope: DashboardScope;
  onScopeChange: (scope: DashboardScope) => void;
  canViewAllBranches: boolean;
  branchName: string;
  activeBranchId: string;
  onActiveBranchChange: (branchId: string) => void;
  isOwner: boolean;
}

function DashboardBody({
  database,
  branches,
  scope,
  onScopeChange,
  canViewAllBranches,
  branchName,
  activeBranchId,
  onActiveBranchChange,
  isOwner,
}: DashboardBodyProps) {
  const data = buildDashboardData(database, scope, new Date());
  const weeklyTotal = data.weeklySales.reduce(
    (sum, sale) => sum + sale.total,
    0,
  );

  return (
    <>
      <DashboardHeader
        title={data.header.title}
        subtitle={data.header.subtitle}
        scope={scope}
        onScopeChange={onScopeChange}
        branches={branches}
        canViewAllBranches={canViewAllBranches}
        branchName={branchName}
        isOwner={isOwner}
        activeBranchId={activeBranchId}
        onActiveBranchChange={onActiveBranchChange}
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        <DashboardStats stats={data.stats} weeklyTotal={weeklyTotal} />

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <WeeklySalesCard sales={data.weeklySales} total={weeklyTotal} />
          <TopSalesCard entries={data.topSales} />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <RecentTransactionsCard transactions={data.recentTransactions} />
          <LowStockCard products={data.lowStock} />
        </div>
      </div>
    </>
  );
}
