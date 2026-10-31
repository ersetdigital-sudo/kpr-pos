/**
 * Prefix nomor harian berformat PREFIX-YYMMDD-. Tahun ikut disertakan agar
 * tanggal yang sama di tahun berbeda tidak menghasilkan nomor yang sama.
 */
export function buildDailyDocumentPrefix(prefix: string, date: Date): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${prefix}-${year}${month}${day}-`;
}

/**
 * Nomor urut berikutnya untuk prefix harian tersebut. Nomor format lama
 * (mis. INV-DDMM-xxx) tidak cocok dengan prefix baru sehingga diabaikan.
 */
export function getNextDailyDocumentNumber(
  numbers: readonly string[],
  prefix: string,
  date: Date,
): string {
  const dailyPrefix = buildDailyDocumentPrefix(prefix, date);

  const highest = numbers.reduce((max, number) => {
    if (!number.startsWith(dailyPrefix)) return max;

    const sequence = Number(number.slice(dailyPrefix.length));
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);

  return `${dailyPrefix}${String(highest + 1).padStart(3, "0")}`;
}
