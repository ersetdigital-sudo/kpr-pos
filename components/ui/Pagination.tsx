"use client";

import { Button } from "@/components/ui/Button";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = "data",
  className,
}: PaginationProps) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2.5 text-label text-ink-muted",
        className,
      )}
    >
      <span>
        Menampilkan {formatNumber(from)} sampai {formatNumber(to)} dari{" "}
        {formatNumber(totalItems)} {itemLabel}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="px-2.5 font-normal"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          Sebelumnya
        </Button>
        <span className="px-1 text-ink">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="px-2.5 font-normal"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
