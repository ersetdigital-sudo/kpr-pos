/** Rentang data yang ikut disinkronkan ke cache tampilan harian. */
export const SYNC_WINDOW_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

export function syncWindowStart(days = SYNC_WINDOW_DAYS, now = new Date()): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

export function syncWindowStartIso(
  days = SYNC_WINDOW_DAYS,
  now = new Date(),
): string {
  return syncWindowStart(days, now).toISOString();
}

/** Versi YYYY-MM-DD untuk kolom bertipe date. */
export function syncWindowStartDate(
  days = SYNC_WINDOW_DAYS,
  now = new Date(),
): string {
  return syncWindowStart(days, now).toISOString().slice(0, 10);
}
