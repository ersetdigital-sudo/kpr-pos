import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full resize-y rounded-control border border-line-strong bg-surface px-3 py-2.5 font-sans text-body text-ink outline-none placeholder:text-ink-muted focus:border-brand",
        className,
      )}
      {...props}
    />
  );
}
