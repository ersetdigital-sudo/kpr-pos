import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "outline" | "dangerOutline" | "dashed";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border-0 bg-brand font-bold text-white",
  outline:
    "border border-line-strong bg-surface font-semibold text-ink",
  dangerOutline:
    "border border-danger-line bg-surface font-semibold text-danger-ink",
  dashed:
    "border border-dashed border-line-dashed bg-surface font-semibold text-ink-soft",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-label",
  md: "h-10 px-3.5 text-body",
  lg: "h-11 px-4 text-body",
  xl: "h-[46px] px-4 text-body",
};

export function Button({
  variant = "outline",
  size = "md",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-control font-sans whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
