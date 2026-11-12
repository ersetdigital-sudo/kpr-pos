import { endOfDay, formatDateRange, isWithinRange, toDateInputValue } from "@/lib/date-range";
import { formatMonthYear } from "@/lib/format";
import {
  countKasbonFilters,
  kasbonStatusFilterMatches,
} from "@/features/kasbon/data/kasbon-calculations";
import type { DateRange } from "@/lib/date-range";
import type {
  KasbonEmployeeRecap,
  KasbonRecapData,
  KasbonRecapFilterState,
  KasbonRecapStats,
  KasbonRecapStatItem,
  KasbonRow,
  KasbonStatusFilter,
} from "@/features/kasbon/types";

export const KASBON_STATUS_FILTER_LABELS: Record<KasbonStatusFilter, string> = {
  all: "Semua status",
  menunggu: "Menunggu persetujuan",
  Disetujui: "Disetujui",
  Lunas: "Lunas",
  Ditolak: "Ditolak",
};

export interface KasbonRecapContext {
  /** Tanggal hari ini (YYYY-MM-DD) untuk rentang cadangan. */
  today: string;
  /** Cabang yang boleh dibaca; "all" untuk pemegang izin semua cabang. */
  branchScope: string | "all";
  branchLabel: string;
  /** Nama karyawan terpilih, dipakai saat filter tidak menghasilkan baris. */
  employeeName: string | null;
}

function emptyStat(): KasbonRecapStatItem {
  return { count: 0, amount: 0 };
}

function emptyStats(): KasbonRecapStats {
  return {
    requested: emptyStat(),
    approved: emptyStat(),
    settled: emptyStat(),
    outstanding: emptyStat(),
    rejected: emptyStat(),
  };
}

function addStat(stat: KasbonRecapStatItem, amount: number): void {
  stat.count += 1;
  stat.amount += amount;
}

function parseMonth(month: string): [number, number] | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);

  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]);

  if (monthIndex < 1 || monthIndex > 12) return null;

  return [year, monthIndex];
}

/** Bulan efektif filter; nilai kosong berarti bulan berjalan. */
export function resolveKasbonRecapMonth(month: string, today: string): string {
  if (parseMonth(month)) return month;

  const [year, monthIndex] = parseMonth(today.slice(0, 7)) ?? [1970, 1];

  return `${year}-${String(monthIndex).padStart(2, "0")}`;
}

/** Rentang filter: bulan penuh, atau rentang tanggal yang dibalik pun tetap aman. */
export function resolveKasbonRecapRange(
  filters: KasbonRecapFilterState,
  today: string,
): DateRange {
  if (filters.periodMode === "month") {
    const [year, monthIndex] = parseMonth(
      resolveKasbonRecapMonth(filters.month, today),
    ) ?? [1970, 1];

    return {
      start: new Date(year, monthIndex - 1, 1),
      end: endOfDay(new Date(year, monthIndex, 0)),
    };
  }

  const fallbackDate = today ? new Date(`${today}T00:00:00`) : new Date(1970, 0, 1);
  const start = filters.start
    ? new Date(`${filters.start}T00:00:00`)
    : fallbackDate;
  const end = filters.end
    ? new Date(`${filters.end}T23:59:59.999`)
    : fallbackDate;

  return start <= end ? { start, end } : { start: end, end: start };
}

export function kasbonRecapPeriodLabel(
  filters: KasbonRecapFilterState,
  range: DateRange,
): string {
  if (filters.periodMode === "month") {
    const [year, monthIndex] = parseMonth(
      toDateInputValue(range.start).slice(0, 7),
    ) ?? [1970, 1];

    return formatMonthYear(new Date(year, monthIndex - 1, 1));
  }

  return formatDateRange(range);
}

/** Bagian nama file ekspor; selalu memuat periode aktif. */
export function kasbonRecapFilePeriod(
  filters: KasbonRecapFilterState,
  range: DateRange,
): string {
  if (filters.periodMode === "month") {
    return toDateInputValue(range.start).slice(0, 7);
  }

  return `${toDateInputValue(range.start)}-sd-${toDateInputValue(range.end)}`;
}

/**
 * Membangun data rekap dari baris yang sudah lolos izin lihat. Filter status
 * ikut memengaruhi ringkasan agar angka di layar, file, dan cetakan sama.
 */
export function buildKasbonRecap(
  rows: readonly KasbonRow[],
  filters: KasbonRecapFilterState,
  context: KasbonRecapContext,
): KasbonRecapData {
  const range = resolveKasbonRecapRange(filters, context.today);

  const scopedRows = rows.filter(
    (row) =>
      (context.branchScope === "all" || row.branchId === context.branchScope) &&
      isWithinRange(row.createdAt, range),
  );

  const employeeRows =
    filters.employeeId === "all"
      ? scopedRows
      : scopedRows.filter((row) => row.employeeId === filters.employeeId);

  const statusCounts = countKasbonFilters(employeeRows);
  const filteredRows = employeeRows.filter((row) =>
    kasbonStatusFilterMatches(row, filters.status),
  );

  const stats = emptyStats();

  filteredRows.forEach((row) => {
    addStat(stats.requested, row.amount);

    if (row.status === "Disetujui" || row.status === "Lunas") {
      addStat(stats.approved, row.amount);
    }
    if (row.status === "Lunas") addStat(stats.settled, row.amount);
    if (row.status === "Disetujui") addStat(stats.outstanding, row.amount);
    if (row.status === "Ditolak") addStat(stats.rejected, row.amount);
  });

  const groups = new Map<string, KasbonEmployeeRecap>();

  filteredRows.forEach((row) => {
    const group = groups.get(row.employeeId) ?? {
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      initials: row.initials,
      branchName: row.branchName,
      count: 0,
      totalAmount: 0,
      rows: [],
    };

    group.count += 1;
    group.totalAmount += row.amount;
    group.rows.push(row);
    groups.set(row.employeeId, group);
  });

  const employees = [...groups.values()].sort((first, second) =>
    first.employeeName.localeCompare(second.employeeName),
  );

  return {
    filters,
    labels: {
      period: kasbonRecapPeriodLabel(filters, range),
      branch: context.branchLabel,
      status: KASBON_STATUS_FILTER_LABELS[filters.status],
      employee:
        filters.employeeId === "all"
          ? "Semua karyawan"
          : (context.employeeName ??
            filteredRows[0]?.employeeName ??
            "Karyawan"),
    },
    range,
    filePeriod: kasbonRecapFilePeriod(filters, range),
    rows: filteredRows,
    employees,
    stats,
    statusCounts,
  };
}
