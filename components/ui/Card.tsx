import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface",
        className,
      )}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  action?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  action,
  subtitle,
  className,
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div>
        <h2 className="m-0 text-card-title font-bold text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 mb-0 text-label text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
