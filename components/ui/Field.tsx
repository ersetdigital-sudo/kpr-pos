import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type FieldLabelSize = "xs" | "sm";

interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  labelSize?: FieldLabelSize;
  className?: string;
}

const LABEL_CLASSES: Record<FieldLabelSize, string> = {
  xs: "text-meta text-ink-muted",
  sm: "text-label text-ink-soft",
};

export function Field({
  label,
  children,
  labelSize = "xs",
  className,
}: FieldProps) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className={cn("font-semibold", LABEL_CLASSES[labelSize])}>
        {label}
      </span>
      {children}
    </label>
  );
}
