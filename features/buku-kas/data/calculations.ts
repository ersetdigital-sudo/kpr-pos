import { collectSalesFrom } from "@/lib/store/sales";
import { formatDateLong, formatDateShort, formatMonthYear } from "@/lib/format";
import type { SalesSource } from "@/lib/store/sales";
import type {
  CashBookEntry,
  CashBookMonthRecap,
  CashBookQuery,
  CashBookRow,
  CashBookSource,
  CashBookView,
} from "@/features/buku-kas/types";

/** Jakarta tidak memakai DST, jadi offset tetap aman dipakai di server & klien. */
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CashBookRange {
  /** Tanggal pertama periode (YYYY-MM-DD, waktu Jakarta). */
  startDate: string;
  /** Tanggal terakhir periode (YYYY-MM-DD, waktu Jakarta). */
  endDate: string;
  /** Awal periode sebagai ISO timestamp. */
  startIso: string;
  /** Akhir periode sebagai ISO timestamp. */
  endIso: string;
}

export function jakartaDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

export function jakartaMonthKey(value: string | Date): string {
  return jakartaDateKey(value).slice(0, 7);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Awal hari Jakarta untuk tanggal YYYY-MM-DD. */
function jakartaDayStartIso(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - JAKARTA_OFFSET_MS).toISOString();
}

/** Rentang tanggal ISO dari periode terpilih; dipakai klien dan server. */
export function resolveCashBookRange(query: CashBookQuery): CashBookRange {
  if (query.period === "harian") {
    const dateKey = query.date || jakartaDateKey(new Date());
    return {
      startDate: dateKey,
      endDate: dateKey,
      startIso: jakartaDayStartIso(dateKey),
      endIso: new Date(
        new Date(jakartaDayStartIso(dateKey)).getTime() + DAY_MS - 1,
      ).toISOString(),
    };
  }

  if (query.period === "bulanan") {
    const monthKey = query.month || jakartaMonthKey(new Date());
    const [year, month] = monthKey.split("-").map(Number);
    const startDate = `${monthKey}-01`;
    const endDate = `${monthKey}-${pad(daysInMonth(year, month))}`;

    return {
      startDate,
      endDate,
      startIso: jakartaDayStartIso(startDate),
      endIso: new Date(
        new Date(jakartaDayStartIso(endDate)).getTime() + DAY_MS - 1,
      ).toISOString(),
    };
  }

  const nowYear = Number(jakartaDateKey(new Date()).slice(0, 4));
  const year = Number(query.year) || nowYear;
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  return {
    startDate,
    endDate,
    startIso: jakartaDayStartIso(startDate),
    endIso: new Date(
      new Date(jakartaDayStartIso(endDate)).getTime() + DAY_MS - 1,
    ).toISOString(),
  };
}

/** Contoh: "12 November 2026", "November 2026", "2026". */
export function formatCashBookPeriod(query: CashBookQuery): string {
  const range = resolveCashBookRange(query);

  if (query.period === "harian") return formatDateLong(range.startDate);
  if (query.period === "bulanan") {
    return formatMonthYear(new Date(`${range.startDate}T00:00:00`));
  }

  return range.startDate.slice(0, 4);
}

function isWithinPeriod(isoDate: string, range: CashBookRange): boolean {
  const time = new Date(isoDate).getTime();
  return (
    time >= new Date(range.startIso).getTime() &&
    time <= new Date(range.endIso).getTime()
  );
}

interface SalesGroup {
  date: string;
  branchId: string;
  source: SalesSource;
  amount: number;
  count: number;
}

function automaticEntryLabel(entry: CashBookEntry): string | undefined {
  if (!entry.isAutomatic) return undefined;

  return entry.sourceType === "kasbon"
    ? "Otomatis dari Kasbon"
    : "Entri otomatis";
}

function buildManualRows(
  entries: readonly CashBookEntry[],
  categoryNameById: Map<string, string>,
  branchNameById: Map<string, string>,
): CashBookRow[] {
  return entries.map((entry) => ({
    id: `entry-${entry.id}`,
    entryId: entry.id,
    date: entry.entryDate,
    dateLabel: formatDateShort(entry.entryDate),
    type: entry.type,
    categoryName: categoryNameById.get(entry.categoryId) ?? "Tanpa kategori",
    description: entry.description,
    amount: entry.amount,
    branchId: entry.branchId,
    branchName: branchNameById.get(entry.branchId) ?? "Cabang",
    actorName: entry.createdByName || "—",
    automatic: entry.isAutomatic,
    automaticLabel: automaticEntryLabel(entry),
  }));
}

function buildAutomaticRows(
  source: CashBookSource,
  query: CashBookQuery,
  range: CashBookRange,
  branchNameById: Map<string, string>,
): CashBookRow[] {
  const isYearly = query.period === "tahunan";

  const sales = collectSalesFrom({
    transactions: source.transactions,
    salesOrders: source.salesOrders,
  }).filter((sale) => isWithinPeriod(sale.at, range));

  const groups = new Map<string, SalesGroup>();

  sales.forEach((sale) => {
    // Tampilan tahunan dikelompokkan per bulan, bukan per hari.
    const date = isYearly
      ? `${jakartaMonthKey(sale.at)}-01`
      : jakartaDateKey(sale.at);
    const key = `${date}|${sale.branchId}|${sale.source}`;
    const group = groups.get(key) ?? {
      date,
      branchId: sale.branchId,
      source: sale.source,
      amount: 0,
      count: 0,
    };

    group.amount += sale.total;
    group.count += 1;
    groups.set(key, group);
  });

  return [...groups.values()].map((group) => ({
    id: `auto-${group.date}-${group.branchId}-${group.source}`,
    date: group.date,
    dateLabel: isYearly
      ? formatMonthYear(new Date(`${group.date}T00:00:00`))
      : formatDateShort(group.date),
    type: "masuk" as const,
    categoryName: "Penjualan",
    description:
      group.source === "Kasir"
        ? `Kasir · ${group.count} transaksi`
        : `Pesanan Sales · ${group.count} pesanan lunas`,
    amount: group.amount,
    branchId: group.branchId,
    branchName: branchNameById.get(group.branchId) ?? "Cabang",
    actorName: "Otomatis",
    automatic: true,
    automaticLabel: "Rekap otomatis penjualan · termasuk PPN & ongkir",
  }));
}

function buildMonthlyRecap(
  rows: readonly CashBookRow[],
  saldoAwal: number,
): CashBookMonthRecap[] {
  const months = new Map<string, { masuk: number; keluar: number }>();

  rows.forEach((row) => {
    const key = row.date.slice(0, 7);
    const month = months.get(key) ?? { masuk: 0, keluar: 0 };

    if (row.type === "masuk") month.masuk += row.amount;
    else month.keluar += row.amount;

    months.set(key, month);
  });

  let saldo = saldoAwal;

  return [...months.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([month, value]) => {
      saldo += value.masuk - value.keluar;

      return {
        month,
        label: formatMonthYear(new Date(`${month}-01T00:00:00`)),
        masuk: value.masuk,
        keluar: value.keluar,
        saldo,
      };
    });
}

/**
 * Menggabungkan entri manual dan rekap penjualan otomatis menjadi satu tabel
 * dengan saldo berjalan dari saldo awal periode.
 */
export function buildCashBookView(
  source: CashBookSource,
  query: CashBookQuery,
): CashBookView {
  const range = resolveCashBookRange(query);
  const categoryNameById = new Map(
    source.categories.map((category) => [category.id, category.name]),
  );
  const branchNameById = new Map(
    source.branches.map((branch) => [branch.id, branch.name]),
  );

  const rows = [
    ...buildManualRows(source.entries, categoryNameById, branchNameById),
    ...buildAutomaticRows(source, query, range, branchNameById),
  ].sort(
    (first, second) =>
      first.date.localeCompare(second.date) ||
      first.description.localeCompare(second.description),
  );

  const totalMasuk = rows
    .filter((row) => row.type === "masuk")
    .reduce((total, row) => total + row.amount, 0);
  const totalKeluar = rows
    .filter((row) => row.type === "keluar")
    .reduce((total, row) => total + row.amount, 0);

  return {
    periodLabel: formatCashBookPeriod(query),
    rows,
    summary: {
      totalMasuk,
      totalKeluar,
      saldoAwal: source.openingBalance,
      saldoAkhir: source.openingBalance + totalMasuk - totalKeluar,
      entryCount: source.entries.length,
    },
    monthlyRecap: buildMonthlyRecap(rows, source.openingBalance),
  };
}
