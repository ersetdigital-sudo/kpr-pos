import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-[42px] w-full rounded-control border border-line-strong bg-surface px-[10px] font-sans text-body text-ink outline-none focus:border-brand",
        className,
      )}
      {...props}
    />
  );
}
