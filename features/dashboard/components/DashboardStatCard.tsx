import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { DashboardCard } from "@/features/dashboard/components/DashboardCard";
import { cn } from "@/lib/cn";

type StatIconTone = "info" | "brand" | "danger" | "success";
type StatValueTone = "default" | "danger";

interface DashboardStatCardProps {
  icon: IconName;
  iconTone: StatIconTone;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  valueTone?: StatValueTone;
}

const ICON_TONE_CLASSES: Record<StatIconTone, string> = {
  info: "bg-info-soft text-info-ink",
  brand: "bg-brand-soft text-brand",
  danger: "bg-danger-soft text-danger-ink",
  success: "bg-success-soft text-success-ink",
};

const VALUE_TONE_CLASSES: Record<StatValueTone, string> = {
  default: "text-ink",
  danger: "text-danger-ink",
};

export function DashboardStatCard({
  icon,
  iconTone,
  label,
  value,
  hint,
  valueTone = "default",
}: DashboardStatCardProps) {
  return (
    <DashboardCard padding="sm" className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 text-label font-medium text-ink-muted">{label}</p>
        <span
          aria-hidden="true"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-control-lg",
            ICON_TONE_CLASSES[iconTone],
          )}
        >
          <Icon name={icon} size={18} strokeWidth={1.8} />
        </span>
      </div>

      <div
        className={cn(
          "mt-2 text-stat font-extrabold tracking-tight",
          VALUE_TONE_CLASSES[valueTone],
        )}
      >
        {value}
      </div>

      {hint ? (
        <div className="mt-1 min-w-0 text-meta text-ink-muted">{hint}</div>
      ) : null}
    </DashboardCard>
  );
}
