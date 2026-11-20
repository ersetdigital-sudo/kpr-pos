import { Fragment } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DocumentBoxProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

/** Kotak berbingkai hitam yang dipakai semua dokumen cetak. */
export function DocumentBox({
  children,
  className,
  padded = true,
}: DocumentBoxProps) {
  return (
    <section
      className={cn("border border-black", padded && "px-3 py-2", className)}
    >
      {children}
    </section>
  );
}

export function DocumentBoxTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "m-0 text-[8.5px] leading-tight font-bold tracking-[0.12em] uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

export interface DocumentInfoItem {
  label: string;
  value: ReactNode;
  strong?: boolean;
}

interface DocumentInfoListProps {
  items: readonly DocumentInfoItem[];
  variant?: "a4" | "dot";
  className?: string;
}

/** Label abu di kiri, nilai tebal di kanan (varian dot tetap hitam). */
export function DocumentInfoList({
  items,
  variant = "a4",
  className,
}: DocumentInfoListProps) {
  const isDot = variant === "dot";

  return (
    <dl
      className={cn(
        "m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1",
        isDot ? "text-[8px] leading-tight" : "text-[9.5px] leading-snug",
        className,
      )}
    >
      {items.map((item) => (
        <Fragment key={item.label}>
          <dt
            className={cn(
              "whitespace-nowrap",
              isDot ? "text-black" : "text-neutral-500",
            )}
          >
            {item.label}
          </dt>
          <dd
            className={cn(
              "m-0 text-right",
              item.strong !== false && "font-semibold",
            )}
          >
            {item.value}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}
