"use client";

import { cn } from "@/lib/cn";
import type { KasirCategory } from "@/features/kasir/types";

interface CategoryFilterProps {
  categories: readonly KasirCategory[];
  activeCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategoryFilter({
  categories,
  activeCategoryId,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={activeCategoryId === null}
        className={cn(
          "h-9 cursor-pointer rounded-pill border px-3.5 font-sans text-label font-semibold",
          activeCategoryId === null
            ? "border-0 bg-ink text-white"
            : "border-line-strong bg-surface text-ink",
        )}
      >
        Semua
      </button>

      {categories.map((category) => {
        const active = category.id === activeCategoryId;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            aria-pressed={active}
            className={cn(
              "h-9 cursor-pointer rounded-pill border px-3.5 font-sans text-label font-semibold",
              active
                ? "border-0 bg-ink text-white"
                : "border-line-strong bg-surface text-ink",
            )}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
