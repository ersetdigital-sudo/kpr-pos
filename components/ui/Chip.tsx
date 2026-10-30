import type { ReactNode } from "react";
import {
  BADGE_DOT_CLASSES,
  BADGE_TONE_CLASSES,
  type BadgeTone,
} from "@/components/ui/badge-tone";
import { cn } from "@/lib/cn";

interface ChipProps {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}

export function Chip({
  children,
  tone = "neutral",
  dot = false,
  className,
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-pill px-3 text-label font-semibold",
        BADGE_TONE_CLASSES[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cn(
            "h-2 w-2 rounded-full",
            BADGE_DOT_CLASSES[tone],
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
