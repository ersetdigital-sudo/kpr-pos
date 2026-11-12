"use client";

import { AccountMenu } from "@/components/layout/AccountMenu";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import type { DashboardScope } from "@/features/dashboard/types";
import type { Branch } from "@/lib/store/types";
import { cn } from "@/lib/cn";

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  scope: DashboardScope;
  onScopeChange: (scope: DashboardScope) => void;
  branches: readonly Branch[];
  canViewAllBranches: boolean;
  branchName: string;
  isOwner: boolean;
  activeBranchId: string;
  onActiveBranchChange: (branchId: string) => void;
}

export function DashboardHeader({
  title,
  subtitle,
  scope,
  onScopeChange,
  branches,
  canViewAllBranches,
  branchName,
  isOwner,
  activeBranchId,
  onActiveBranchChange,
}: DashboardHeaderProps) {
  const { openSidebar } = useSidebar();

  return (
    <header className="border-b border-line bg-surface px-4 py-4 sm:px-5 lg:px-7">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={openSidebar}
            aria-label="Buka menu navigasi"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-control border border-line-strong bg-surface text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:hidden"
          >
            <Icon name="menu" size={20} strokeWidth={2} />
          </button>

          <div className="min-w-0">
            <h1 className="m-0 text-page-title font-bold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-[2px] mb-0 text-label text-ink-muted">{subtitle}</p>
          </div>
        </div>

        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 lg:justify-end">
          {canViewAllBranches ? (
            <div
              role="group"
              aria-label="Filter cabang dashboard"
              className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-pill border border-line bg-surface p-1 shadow-dashboard [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <ScopeButton
                label="Semua cabang"
                active={scope === "all"}
                onClick={() => onScopeChange("all")}
              />
              {branches.map((branch) => (
                <ScopeButton
                  key={branch.id}
                  label={branch.name}
                  active={scope === branch.id}
                  onClick={() => onScopeChange(branch.id)}
                />
              ))}
            </div>
          ) : (
            <Chip tone="neutral">{branchName}</Chip>
          )}

          {isOwner ? (
            <label className="flex h-10 shrink-0 items-center gap-1.5 rounded-pill border border-line bg-surface px-3 text-label shadow-dashboard focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
              <Icon
                name="store"
                size={15}
                strokeWidth={1.8}
                className="text-ink-muted"
              />
              <span className="text-meta whitespace-nowrap text-ink-muted">
                Aktif
              </span>
              <span className="relative inline-flex items-center">
                <select
                  aria-label="Cabang aktif"
                  value={activeBranchId}
                  onChange={(event) =>
                    onActiveBranchChange(event.target.value)
                  }
                  className="h-8 max-w-[92px] cursor-pointer appearance-none border-0 bg-transparent pr-5 font-sans text-label font-semibold text-ink outline-none"
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <Icon
                  name="chevronDown"
                  size={14}
                  strokeWidth={2}
                  className="pointer-events-none absolute right-0 text-ink-muted"
                />
              </span>
            </label>
          ) : null}

          <Chip tone="success" dot className="h-9 px-3.5">
            Tersinkron
          </Chip>

          <div className="rounded-pill border border-line bg-surface p-0.5 pr-1 shadow-dashboard">
            <AccountMenu />
          </div>
        </div>
      </div>
    </header>
  );
}

interface ScopeButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function ScopeButton({ label, active, onClick }: ScopeButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 cursor-pointer rounded-pill px-3 font-sans text-label font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        active
          ? "bg-brand text-white shadow-sm"
          : "text-ink-muted hover:bg-canvas hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}
