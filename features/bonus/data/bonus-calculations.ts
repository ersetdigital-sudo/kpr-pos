import { isWithinRange } from "@/lib/date-range";
import type { DateRange } from "@/lib/date-range";
import { formatMonthYear } from "@/lib/format";
import {
  isCountedSalesOrder,
} from "@/lib/store/sales";
import { isTransactionRefunded } from "@/lib/store/transactions";
import type { AppDatabase } from "@/lib/store/types";
import {
  collectBonusEntries,
  describeBonusRule,
  getOrderQuantity,
} from "@/features/pesanan/data/pesanan-calculations";
import type {
  BonusMonthReport,
  BonusTransactionRow,
  BonusYearReport,
  BonusYearSalesRow,
} from "@/features/bonus/types";

function monthRange(year: number, monthIndex: number): DateRange {
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
  };
}

/** YYYY-MM → rentang tanggal penuh satu bulan. */
export function parseMonthKey(monthKey: string): { year: number; monthIndex: number } {
  const [yearRaw, monthRaw] = monthKey.split("-").map(Number);
  const year = Number.isFinite(yearRaw) ? yearRaw : new Date().getFullYear();
  const month = Number.isFinite(monthRaw) ? monthRaw - 1 : new Date().getMonth();

  return {
    year,
    monthIndex: Math.min(11, Math.max(0, month)),
  };
}

export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthKey: string): string {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return formatMonthYear(new Date(year, monthIndex, 1));
}

/**
 * Dasar bonus hanya pesanan Lunas (uang sudah diterima) dan transaksi kasir
 * yang tidak direfund. COD/Tempo yang belum lunas tidak masuk bonus; pelunasan
 * bulan berikutnya otomatis masuk bulan pelunasan lewat `paidAt`.
 */
export function collectBonusTransactions(
  database: AppDatabase,
  range: DateRange,
  branchId?: string,
): BonusTransactionRow[] {
  const employeeById = new Map(
    database.employees.map((employee) => [employee.id, employee]),
  );
  const branchById = new Map(
    database.branches.map((branch) => [branch.id, branch]),
  );

  const orderRows: BonusTransactionRow[] = database.salesOrders
    .filter(isCountedSalesOrder)
    .filter((order) => !branchId || order.branchId === branchId)
    .filter((order) => isWithinRange(order.paidAt ?? order.createdAt, range))
    .map((order) => ({
      id: order.id,
      number: order.orderNumber,
      source: "Pesanan Sales" as const,
      at: order.paidAt ?? order.createdAt,
      salesEmployeeId: order.salesEmployeeId,
      salesName: employeeById.get(order.salesEmployeeId)?.name ?? "Sales",
      customerName: order.customerName,
      branchName: branchById.get(order.branchId)?.name ?? "-",
      quantity: getOrderQuantity(order),
      nominal: order.total,
    }));

  const transactionRows: BonusTransactionRow[] = database.transactions
    .filter((transaction) => !isTransactionRefunded(transaction))
    .filter((transaction) => transaction.salesEmployeeId !== null)
    .filter((transaction) => !branchId || transaction.branchId === branchId)
    .filter((transaction) => isWithinRange(transaction.createdAt, range))
    .map((transaction) => ({
      id: transaction.id,
      number: transaction.invoiceNumber,
      source: "Kasir" as const,
      at: transaction.createdAt,
      salesEmployeeId: transaction.salesEmployeeId as string,
      salesName:
        employeeById.get(transaction.salesEmployeeId as string)?.name ??
        "Sales",
      customerName: "-",
      branchName: branchById.get(transaction.branchId)?.name ?? "-",
      quantity: transaction.items.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
      nominal: transaction.total,
    }));

  return [...orderRows, ...transactionRows].sort(
    (first, second) =>
      new Date(second.at).getTime() - new Date(first.at).getTime(),
  );
}

export function buildBonusMonthReport(
  database: AppDatabase,
  monthKey: string,
  branchId?: string,
): BonusMonthReport {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const range = monthRange(year, monthIndex);
  const entries = collectBonusEntries(database, range, branchId);
  const transactions = collectBonusTransactions(database, range, branchId);

  return {
    month: monthKey,
    monthLabel: monthLabel(monthKey),
    entries,
    transactions,
    totalQuantity: entries.reduce((total, entry) => total + entry.quantity, 0),
    totalNominal: entries.reduce((total, entry) => total + entry.nominal, 0),
    totalBonus: entries.reduce((total, entry) => total + entry.bonus, 0),
    ruleLabel: describeBonusRule(database.settings.salesBonus),
  };
}

/**
 * Akumulasi bonus setahun: bonus dikunci per bulan (tier dihitung bulanan),
 * lalu dijumlahkan per sales agar laporan tahunan tetap konsisten.
 */
export function buildBonusYearReport(
  database: AppDatabase,
  year: number,
  branchId?: string,
): BonusYearReport {
  const monthLabels = Array.from({ length: 12 }, (_, monthIndex) =>
    formatMonthYear(new Date(year, monthIndex, 1)),
  );
  const perSales = new Map<string, BonusYearSalesRow>();
  const monthTotals = Array.from({ length: 12 }, () => 0);

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const entries = collectBonusEntries(
      database,
      monthRange(year, monthIndex),
      branchId,
    );

    entries.forEach((entry) => {
      const existing = perSales.get(entry.salesEmployeeId) ?? {
        salesEmployeeId: entry.salesEmployeeId,
        salesName: entry.salesName,
        months: Array.from({ length: 12 }, () => 0),
        quantity: 0,
        nominal: 0,
        totalBonus: 0,
      };

      existing.months[monthIndex] += entry.bonus;
      existing.quantity += entry.quantity;
      existing.nominal += entry.nominal;
      existing.totalBonus += entry.bonus;
      perSales.set(entry.salesEmployeeId, existing);
      monthTotals[monthIndex] += entry.bonus;
    });
  }

  const rows = [...perSales.values()].sort(
    (first, second) => second.totalBonus - first.totalBonus,
  );

  return {
    year,
    monthLabels,
    monthTotals,
    perSales: rows,
    totalBonus: rows.reduce((total, row) => total + row.totalBonus, 0),
    totalQuantity: rows.reduce((total, row) => total + row.quantity, 0),
    totalNominal: rows.reduce((total, row) => total + row.nominal, 0),
  };
}
