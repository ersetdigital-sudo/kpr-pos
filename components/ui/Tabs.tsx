"use client";

import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  badge?: string | number;
}

interface TabsProps<T extends string> {
  tabs: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex flex-wrap gap-1 overflow-x-auto border-b border-line-strong",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "h-11 cursor-pointer border-x-0 border-t-0 border-b-[3px] bg-transparent px-4 font-sans text-body whitespace-nowrap",
              active
                ? "border-brand font-bold text-ink"
                : "border-transparent font-semibold text-ink-muted hover:text-ink",
            )}
          >
            {tab.label}
            {tab.badge !== undefined ? (
              <span className="ml-1.5 text-meta text-ink-muted">
                ({tab.badge})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
