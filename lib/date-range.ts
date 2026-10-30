import type { DateRangeValue } from "@/components/ui/DateRangePicker";
import { formatDateLong } from "@/lib/format";

export interface DateRange {
  start: Date;
  end: Date;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthRange(reference: Date): DateRange {
  return {
    start: new Date(reference.getFullYear(), reference.getMonth(), 1),
    end: endOfDay(reference),
  };
}

/** Rentang filter laporan; "Minggu ini" mulai Senin. */
export function resolveDateRange(
  value: DateRangeValue,
  today: Date,
): DateRange {
  if (value.preset === "today") {
    return { start: startOfDay(today), end: endOfDay(today) };
  }

  if (value.preset === "week") {
    const dayIndex = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayIndex);
    return { start: startOfDay(monday), end: endOfDay(today) };
  }

  if (value.preset === "month") {
    return getMonthRange(today);
  }

  const start = value.start
    ? new Date(`${value.start}T00:00:00`)
    : startOfDay(today);
  const end = value.end ? new Date(`${value.end}T23:59:59.999`) : endOfDay(today);

  // Rentang terbalik tetap aman: pakai tanggal paling awal sebagai start.
  return start <= end ? { start, end } : { start: end, end: start };
}

export function isWithinRange(
  isoDate: string,
  range: DateRange,
): boolean {
  const time = new Date(isoDate).getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export function isSameDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function getLastDays(today: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - 1 - index));
    return startOfDay(date);
  });
}

export function formatDateRange(range: DateRange): string {
  if (isSameDay(range.start, range.end)) {
    return formatDateLong(range.start);
  }

  return `${formatDateLong(range.start)} – ${formatDateLong(range.end)}`;
}

export function formatDateInput(isoDate: string): string {
  return toDateInputValue(new Date(isoDate));
}
