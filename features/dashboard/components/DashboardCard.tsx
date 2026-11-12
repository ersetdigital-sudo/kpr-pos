import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type DashboardCardTone = "surface" | "dark";
type DashboardCardPadding = "none" | "sm" | "md" | "lg";

interface DashboardCardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: DashboardCardTone;
  padding?: DashboardCardPadding;
}

const TONE_CLASSES: Record<DashboardCardTone, string> = {
  surface: "border-line bg-surface text-ink",
  dark: "border-ink bg-ink text-white",
};

const PADDING_CLASSES: Record<DashboardCardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-5 sm:p-6",
};

/** Kartu dasar Dashboard: satu sumber radius, border, dan bayangan. */
export function DashboardCard({
  tone = "surface",
  padding = "md",
  className,
  ...props
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-dashboard border shadow-dashboard",
        TONE_CLASSES[tone],
        PADDING_CLASSES[padding],
        className,
      )}
      {...props}
    />
  );
}
