import type { ReactNode } from "react";
import {
  BADGE_TONE_CLASSES,
  type BadgeTone,
} from "@/components/ui/badge-tone";
import { cn } from "@/lib/cn";

interface StatusBadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  strong?: boolean;
  className?: string;
}

export function StatusBadge({
  children,
  tone = "neutral",
  strong = false,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-badge px-2 py-[3px] text-meta",
        strong ? "font-bold" : "font-semibold",
        BADGE_TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
