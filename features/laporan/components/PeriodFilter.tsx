import { cn } from "@/lib/cn";

const PERIODS = ["Hari ini", "Minggu ini", "Bulan ini"] as const;

export function PeriodFilter() {
  return (
    <div className="flex overflow-hidden rounded-control border border-line-strong">
      {PERIODS.map((period, index) => {
        const active = index === PERIODS.length - 1;

        return (
          <button
            key={period}
            type="button"
            aria-pressed={active}
            className={cn(
              "h-[38px] cursor-pointer border-0 px-3 font-sans text-label font-semibold",
              active ? "bg-ink text-white" : "bg-surface text-ink-muted",
              index > 0 && "border-l border-line-strong",
            )}
          >
            {period}
          </button>
        );
      })}
    </div>
  );
}
