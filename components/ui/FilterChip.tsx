"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}

/** Chip filter bersama: dipakai daftar kasbon dan filter rekap. */
export function FilterChip({ active, onClick, children, count }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-pill border px-3 font-sans text-label font-semibold whitespace-nowrap",
        active
          ? "border-brand bg-brand-soft text-brand"
          : "border-line bg-surface text-ink-muted hover:bg-line-subtle hover:text-ink",
      )}
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            "text-meta font-semibold",
            active ? "text-brand" : "text-ink-muted",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
