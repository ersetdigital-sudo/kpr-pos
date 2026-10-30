const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

const longDateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
});

const fullDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatNumber(value: number): string {
  return rupiahFormatter.format(value);
}

export function formatRupiah(value: number): string {
  return `Rp ${formatNumber(value)}`;
}

/** Ringkasan nominal besar, contoh: 29_400_000 -> "Rp 29,4 jt". */
export function formatRupiahCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `Rp ${decimalFormatter.format(value / 1_000_000_000)} M`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `Rp ${decimalFormatter.format(value / 1_000_000)} jt`;
  }
  return formatRupiah(value);
}

/** Label grafik tanpa awalan "Rp", contoh: 3_900_000 -> "3,9jt". */
export function formatMillionsShort(value: number): string {
  return `${decimalFormatter.format(value / 1_000_000)}jt`;
}

export function formatPercent(value: number): string {
  return `${decimalFormatter.format(value)}%`;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(`${value}T00:00:00`);
}

/** Contoh: "Kamis, 29 Oktober 2026". */
export function formatDateLong(value: string | Date): string {
  return longDateFormatter.format(toDate(value));
}

/** Contoh: "29 Oktober 2026, 13:12". */
export function formatDateTimeLong(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${fullDateFormatter.format(date)}, ${hours}:${minutes}`;
}

/** Contoh: "29 Okt, 13:12". */
export function formatDateTimeShort(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // Format manual agar pemisah jam tetap titik dua, bukan titik seperti id-ID.
  return `${shortDateFormatter.format(date)}, ${hours}:${minutes}`;
}
