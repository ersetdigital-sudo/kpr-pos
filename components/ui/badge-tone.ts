export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "brand"
  | "danger";

export const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-canvas text-ink-soft",
  info: "bg-info-soft text-info-ink",
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  brand: "bg-brand-tint text-brand-strong",
  danger: "bg-danger-soft text-danger-ink",
};

export const BADGE_DOT_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-ink-muted",
  info: "bg-info-ink",
  success: "bg-success",
  warning: "bg-warning",
  brand: "bg-brand",
  danger: "bg-danger-ink",
};
