import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value: number;
  size?: "sm" | "md";
  className?: string;
}

export function ProgressBar({
  value,
  size = "sm",
  className,
}: ProgressBarProps) {
  // Nilai dijaga di rentang 0–100 agar lebar bar tidak pernah negatif.
  const width = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "w-full rounded-pill bg-line",
        size === "sm" ? "h-2" : "h-2.5",
        className,
      )}
    >
      <div
        className="rounded-pill bg-brand"
        style={{ width: `${width}%`, height: "100%" }}
      />
    </div>
  );
}
