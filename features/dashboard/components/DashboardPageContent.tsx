"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { Select } from "@/components/ui/Select";
import { DashboardStats } from "@/features/dashboard/components/DashboardStats";
import { LowStockCard } from "@/features/dashboard/components/LowStockCard";
import { RecentTransactionsCard } from "@/features/dashboard/components/RecentTransactionsCard";
import { TopSalesCard } from "@/features/dashboard/components/TopSalesCard";
import { WeeklySalesCard } from "@/features/dashboard/components/WeeklySalesCard";
import { buildDashboardData } from "@/features/dashboard/data/dashboard-calculations";
import { useDashboardData } from "@/features/dashboard/data/dashboard-repository";
import {
  usePermissions,
  useSession,
} from "@/features/session/data/session-repository";
import type { AppDatabase, Branch } from "@/lib/store/types";
import type { DashboardScope } from "@/features/dashboard/types";

export function DashboardPageContent() {
  const database = useDashboardData();
  const { branch, branches } = useSession();
  const permissions = usePermissions();
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
        <PageHeader title="Dashboard" subtitle="Memuat ringkasan…" />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-body text-ink-muted">
            Menyiapkan data…
          </div>
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
}

function DashboardBody({
  database,
  branches,
  scope,
  onScopeChange,
  canViewAllBranches,
  branchName,
}: DashboardBodyProps) {
  const data = buildDashboardData(database, scope, new Date());

  return (
    <>
      <PageHeader
        title={data.header.title}
        subtitle={data.header.subtitle}
        actions={
          <>
            {canViewAllBranches ? (
              <Select
                aria-label="Filter cabang dashboard"
                value={scope}
                onChange={(event) =>
                  onScopeChange(event.target.value as DashboardScope)
                }
                className="h-10 w-auto max-w-[190px] text-label"
              >
                <option value="all">Semua Cabang</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Chip tone="neutral">{branchName}</Chip>
            )}
            <Chip tone="success" dot>
              Online · Tersinkron
            </Chip>
          </>
        }
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        <DashboardStats stats={data.stats} />

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <WeeklySalesCard sales={data.weeklySales} />
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
