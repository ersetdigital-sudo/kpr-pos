import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-[42px] w-full rounded-control border border-line-strong bg-surface px-[10px] font-sans text-body text-ink outline-none placeholder:text-ink-muted focus:border-brand",
        className,
      )}
      {...props}
    />
  );
}
