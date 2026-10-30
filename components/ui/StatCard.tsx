import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type StatCardTone = "default" | "brand" | "success" | "danger";
type StatCardSize = "md" | "sm";
type StatHintTone = "muted" | "success";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  valueTone?: StatCardTone;
  hintTone?: StatHintTone;
  size?: StatCardSize;
  labelWeight?: "normal" | "medium";
}

const VALUE_TONE_CLASSES: Record<StatCardTone, string> = {
  default: "text-ink",
  brand: "text-brand",
  success: "text-success-ink",
  danger: "text-danger-ink",
};

export function StatCard({
  label,
  value,
  hint,
  valueTone = "default",
  hintTone = "muted",
  size = "md",
  labelWeight = "medium",
}: StatCardProps) {
  const isCompact = size === "sm";

  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface",
        isCompact ? "p-4" : "p-[18px]",
      )}
    >
      <div
        className={cn(
          "text-label text-ink-muted",
          labelWeight === "medium" ? "font-medium" : "font-normal",
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 font-extrabold",
          isCompact ? "text-page-title" : "text-stat",
          VALUE_TONE_CLASSES[valueTone],
        )}
      >
        {value}
      </div>
      {hint ? (
        <div
          className={cn(
            "mt-1.5 text-meta",
            hintTone === "success"
              ? "font-semibold text-success-ink"
              : "text-ink-muted",
          )}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}
