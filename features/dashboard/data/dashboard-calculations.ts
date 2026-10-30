import { getLastDays, getMonthRange, isSameDay } from "@/lib/date-range";
import { formatDateLong, formatTime } from "@/lib/format";
import { isTransactionRefunded } from "@/lib/store/transactions";
import type { AppDatabase, AttendanceRecord } from "@/lib/store/types";
import {
  buildLeaderboard,
  collectBonusEntries,
} from "@/features/pesanan/data/pesanan-calculations";
import type {
  DashboardData,
  DashboardScope,
  LowStockProduct,
  WeeklySale,
} from "@/features/dashboard/types";

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function inScope(branchId: string, scope: DashboardScope): boolean {
  return scope === "all" || branchId === scope;
}

function latestAttendanceDate(
  records: readonly AttendanceRecord[],
): string | null {
  return records.reduce<string | null>(
    (latest, record) => (!latest || record.date > latest ? record.date : latest),
    null,
  );
}

export function buildDashboardData(
  database: AppDatabase,
  scope: DashboardScope,
  today: Date,
): DashboardData {
  const transactions = database.transactions.filter(
    (transaction) =>
      !isTransactionRefunded(transaction) &&
      inScope(transaction.branchId, scope),
  );
  const todayTransactions = transactions.filter((transaction) =>
    isSameDay(new Date(transaction.createdAt), today),
  );
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayTotal = transactions
    .filter((transaction) =>
      isSameDay(new Date(transaction.createdAt), yesterday),
    )
    .reduce((sum, transaction) => sum + transaction.total, 0);
  const salesToday = todayTransactions.reduce(
    (sum, transaction) => sum + transaction.total,
    0,
  );
  const growthPercent =
    yesterdayTotal > 0
      ? Math.round(((salesToday - yesterdayTotal) / yesterdayTotal) * 100)
      : salesToday > 0
        ? 100
        : 0;

  const paymentCounts = { cash: 0, qris: 0, transfer: 0 };
  todayTransactions.forEach((transaction) => {
    if (transaction.payment.method === "Cash") paymentCounts.cash += 1;
    if (transaction.payment.method === "QRIS") paymentCounts.qris += 1;
    if (transaction.payment.method === "Transfer") paymentCounts.transfer += 1;
  });

  const scopedStocks = database.stocks.filter((stock) =>
    inScope(stock.branchId, scope),
  );
  const activeProducts = database.products.filter(
    (product) => product.isActive,
  );
  const branchById = new Map(
    database.branches.map((branch) => [branch.id, branch]),
  );

  const lowStock: LowStockProduct[] = [];
  const lowStockProductIds = new Set<string>();

  activeProducts.forEach((product) => {
    const levels = scopedStocks.filter(
      (stock) => stock.productId === product.id,
    );

    levels.forEach((level) => {
      if (level.quantity > level.minStock) return;

      lowStockProductIds.add(product.id);
      lowStock.push({
        id: `${product.id}-${level.branchId}`,
        name: product.name,
        branch: branchById.get(level.branchId)?.name ?? "Cabang",
        remaining: level.quantity,
      });
    });
  });

  lowStock.sort((first, second) => first.remaining - second.remaining);

  const attendance = database.attendance.filter((record) =>
    inScope(record.branchId, scope),
  );
  const attendanceDate = latestAttendanceDate(attendance);
  const dayAttendance = attendanceDate
    ? attendance.filter((record) => record.date === attendanceDate)
    : [];
  const scopedEmployees = database.employees.filter(
    (employee) =>
      employee.isActive && inScope(employee.branchId, scope),
  );

  const weeklySales: WeeklySale[] = getLastDays(today, 7).map((day) => {
    const total = transactions
      .filter((transaction) =>
        isSameDay(new Date(transaction.createdAt), day),
      )
      .reduce((sum, transaction) => sum + transaction.total, 0);

    return {
      key: day.toISOString(),
      day: DAY_LABELS[day.getDay()] ?? "-",
      total,
      barHeight: 0,
      isCurrentDay: isSameDay(day, today),
    };
  });
  const maxWeekly = Math.max(...weeklySales.map((sale) => sale.total), 0);
  weeklySales.forEach((sale) => {
    sale.barHeight =
      maxWeekly > 0 ? Math.max(4, Math.round((sale.total / maxWeekly) * 176)) : 0;
  });

  const bonusEntries = collectBonusEntries(
    database,
    getMonthRange(today),
    scope === "all" ? undefined : scope,
  );
  const leaderboard = buildLeaderboard(bonusEntries, "");
  const topQuantity = leaderboard[0]?.soldCount ?? 0;

  const cashierById = new Map(
    database.employees.map((employee) => [employee.id, employee]),
  );

  const recentTransactions = [...transactions]
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
    .slice(0, 4)
    .map((transaction) => ({
      id: transaction.id,
      invoiceNumber: transaction.invoiceNumber,
      time: formatTime(transaction.createdAt),
      cashier: cashierById.get(transaction.cashierId)?.name ?? "Kasir",
      method: transaction.payment.method,
      total: transaction.total,
    }));

  return {
    header: {
      title: "Dashboard",
      subtitle: `${formatDateLong(today)} · ${
        scope === "all"
          ? "Ringkasan seluruh cabang"
          : (branchById.get(scope)?.name ?? "Cabang")
      }`,
    },
    stats: {
      salesToday,
      growthPercent,
      transactionCount: todayTransactions.length,
      paymentCounts,
      lowStockCount: lowStockProductIds.size,
      employeesPresent: dayAttendance.filter(
        (record) => record.status === "Hadir",
      ).length,
      employeesTotal: scopedEmployees.length,
      employeesOnLeave: dayAttendance.filter(
        (record) => record.status === "Izin" || record.status === "Sakit",
      ).length,
      attendanceDate,
    },
    weeklySales,
    topSales: leaderboard.slice(0, 4).map((entry) => ({
      rank: entry.rank,
      name: entry.salesName,
      soldCount: entry.soldCount,
      bonus: entry.bonus,
      progress:
        topQuantity > 0
          ? Math.round((entry.soldCount / topQuantity) * 100)
          : 0,
    })),
    recentTransactions,
    lowStock: lowStock.slice(0, 4),
  };
}
