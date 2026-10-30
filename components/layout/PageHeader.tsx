"use client";

import type { ReactNode } from "react";
import { SessionControls } from "@/components/layout/SessionControls";
import { useSidebar } from "@/components/layout/sidebar-context";
import { UserBadge } from "@/components/layout/UserBadge";
import { Icon } from "@/components/ui/Icon";
import { useSession } from "@/features/session/data/session-repository";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const { openSidebar } = useSidebar();
  const { employee } = useSession();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-4 lg:px-7">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={openSidebar}
          aria-label="Buka menu navigasi"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-control border border-line-strong bg-surface text-ink lg:hidden"
        >
          <Icon name="menu" size={20} strokeWidth={2} />
        </button>

        <div className="min-w-0">
          <h1 className="m-0 text-page-title font-bold text-ink">{title}</h1>
          <p className="mt-[2px] mb-0 text-label text-ink-muted">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-[10px]">
        {actions}
        <SessionControls />
        <UserBadge user={employee} />
      </div>
    </header>
  );
}
