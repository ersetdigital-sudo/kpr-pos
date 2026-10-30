"use client";

import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export type DateRangePreset = "today" | "week" | "month" | "custom";

export interface DateRangeValue {
  preset: DateRangePreset;
  /** Hanya dipakai saat preset "custom" (format YYYY-MM-DD). */
  start: string;
  end: string;
}

const PRESETS: readonly { id: Exclude<DateRangePreset, "custom">; label: string }[] =
  [
    { id: "today", label: "Hari ini" },
    { id: "week", label: "Minggu ini" },
    { id: "month", label: "Bulan ini" },
  ];

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** Tanggal awal saat mode custom pertama kali dibuka (format YYYY-MM-DD). */
  defaultDate?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  defaultDate,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex overflow-hidden rounded-control border border-line-strong">
        {PRESETS.map((preset, index) => {
          const active = value.preset === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...value, preset: preset.id })}
              className={cn(
                "h-[38px] cursor-pointer border-0 px-3 font-sans text-label font-semibold",
                active ? "bg-ink text-white" : "bg-surface text-ink-muted",
                index > 0 && "border-l border-line-strong",
              )}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={value.preset === "custom"}
          onClick={() =>
            onChange({
              ...value,
              preset: "custom",
              start: value.start || defaultDate || "",
              end: value.end || defaultDate || "",
            })
          }
          className={cn(
            "h-[38px] cursor-pointer border-0 border-l border-line-strong px-3 font-sans text-label font-semibold",
            value.preset === "custom"
              ? "bg-ink text-white"
              : "bg-surface text-ink-muted",
          )}
        >
          Custom
        </button>
      </div>

      {value.preset === "custom" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="sr-only" htmlFor="report-start">
            Tanggal mulai
          </label>
          <Input
            id="report-start"
            type="date"
            value={value.start}
            onChange={(event) =>
              onChange({ ...value, start: event.target.value })
            }
            className="h-[38px] w-[150px] text-label"
          />
          <span className="text-label text-ink-muted">s/d</span>
          <label className="sr-only" htmlFor="report-end">
            Tanggal akhir
          </label>
          <Input
            id="report-end"
            type="date"
            value={value.end}
            onChange={(event) =>
              onChange({ ...value, end: event.target.value })
            }
            className="h-[38px] w-[150px] text-label"
          />
        </div>
      ) : null}
    </div>
  );
}
