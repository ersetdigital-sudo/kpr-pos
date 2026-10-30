import { ALL_ROLES } from "@/constants/roles";
import { formatDateRange, isWithinRange } from "@/lib/date-range";
import { isTransactionRefunded } from "@/lib/store/transactions";
import type { DateRange } from "@/lib/date-range";
import type { AppDatabase, Transaction } from "@/lib/store/types";
import type { PaymentMethod } from "@/types";
import {
  collectBonusEntries,
} from "@/features/pesanan/data/pesanan-calculations";
import type {
  BestSeller,
  CashierReport,
  PaymentBreakdown,
  ReportData,
  ReportLogRow,
  ReportLogUser,
  ReportTransactionRow,
} from "@/features/laporan/types";
import type { Role } from "@/constants/roles";

type BranchScope = string | "all";

const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "Cash",
  "QRIS",
  "Transfer",
];

function isInScope(branchId: string, scope: BranchScope): boolean {
  return scope === "all" || branchId === scope;
}

function transactionProfit(
  transaction: Transaction,
  database: AppDatabase,
): number {
  return transaction.items.reduce((total, item) => {
    const product = database.products.find(
      (candidate) => candidate.id === item.productId,
    );
    const unitCost = item.unitCost ?? product?.costPrice ?? 0;
    return total + (item.unitPrice - unitCost) * item.quantity;
  }, 0);
}

/** Pilihan filter "user" pada Log Aktivitas, diambil dari log yang tersimpan. */
export function buildLogUsers(database: AppDatabase): ReportLogUser[] {
  const users = new Map<string, ReportLogUser>();

  database.activityLogs.forEach((log) => {
    users.set(log.userId, {
      id: log.userId,
      name: log.userName,
      role: log.role,
    });
  });

  return [...users.values()].sort((first, second) =>
    first.name.localeCompare(second.name),
  );
}

export function buildReportData(
  database: AppDatabase,
  range: DateRange,
  branchScope: BranchScope,
  roleFilter: Role | "all",
  userFilter: string | "all",
): ReportData {
  const branchById = new Map(
    database.branches.map((branch) => [branch.id, branch]),
  );
  const employeeById = new Map(
    database.employees.map((employee) => [employee.id, employee]),
  );

  const transactions = database.transactions
    .filter((transaction) => !isTransactionRefunded(transaction))
    .filter((transaction) => isInScope(transaction.branchId, branchScope))
    .filter((transaction) => isWithinRange(transaction.createdAt, range))
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    );

  const revenue = transactions.reduce(
    (sum, transaction) => sum + transaction.total,
    0,
  );
  const grossProfit = transactions.reduce(
    (sum, transaction) => sum + transactionProfit(transaction, database),
    0,
  );
  const transactionCount = transactions.length;
  const averageTransaction =
    transactionCount > 0 ? Math.round(revenue / transactionCount) : 0;

  const bonusEntries = collectBonusEntries(
    database,
    range,
    branchScope === "all" ? undefined : branchScope,
  );
  const totalSalesBonus = bonusEntries.reduce(
    (sum, entry) => sum + entry.bonus,
    0,
  );
  const activeSalespeople = bonusEntries.filter(
    (entry) => entry.quantity > 0,
  ).length;

  const paymentBreakdown: PaymentBreakdown[] = PAYMENT_METHODS.map(
    (method) => {
      const amount = transactions
        .filter((transaction) => transaction.payment.method === method)
        .reduce((sum, transaction) => sum + transaction.total, 0);

      return {
        method,
        amount,
        percent: revenue > 0 ? Math.round((amount / revenue) * 100) : 0,
      };
    },
  );

  const cashierTotals = new Map<string, CashierReport>();
  transactions.forEach((transaction) => {
    const existing = cashierTotals.get(transaction.cashierId) ?? {
      cashierId: transaction.cashierId,
      name: employeeById.get(transaction.cashierId)?.name ?? "Kasir",
      transactionCount: 0,
      revenue: 0,
    };

    existing.transactionCount += 1;
    existing.revenue += transaction.total;
    cashierTotals.set(transaction.cashierId, existing);
  });

  const cashiers = [...cashierTotals.values()].sort(
    (first, second) => second.revenue - first.revenue,
  );

  const cashDifference = transactions.reduce((total, transaction) => {
    if (transaction.payment.method !== "Cash") return total;

    return (
      total +
      ((transaction.payment.cashReceived ?? 0) -
        (transaction.payment.change ?? 0) -
        transaction.total)
    );
  }, 0);

  const soldByProduct = new Map<string, { name: string; quantity: number }>();
  transactions.forEach((transaction) => {
    transaction.items.forEach((item) => {
      const existing = soldByProduct.get(item.productId) ?? {
        name: item.productName,
        quantity: 0,
      };
      existing.quantity += item.quantity;
      soldByProduct.set(item.productId, existing);
    });
  });

  const bestSellers: BestSeller[] = [...soldByProduct.values()]
    .sort((first, second) => second.quantity - first.quantity)
    .slice(0, 4)
    .map((entry, index) => ({
      rank: index + 1,
      name: entry.name,
      soldCount: entry.quantity,
    }));

  const activityLog: ReportLogRow[] = database.activityLogs
    .filter((log) => isInScope(log.branchId, branchScope))
    .filter((log) => isWithinRange(log.at, range))
    .filter((log) => roleFilter === "all" || log.role === roleFilter)
    .filter((log) => userFilter === "all" || log.userId === userFilter)
    .sort(
      (first, second) =>
        new Date(second.at).getTime() - new Date(first.at).getTime(),
    )
    .map((log) => ({
      id: log.id,
      at: log.at,
      userId: log.userId,
      userName: log.userName,
      role: log.role,
      branchName: branchById.get(log.branchId)?.name ?? "-",
      action: log.action,
      detail: log.detail,
    }));

  const transactionRows: ReportTransactionRow[] = transactions.map(
    (transaction) => ({
      invoiceNumber: transaction.invoiceNumber,
      createdAt: transaction.createdAt,
      cashierName: employeeById.get(transaction.cashierId)?.name ?? "Kasir",
      branchName: branchById.get(transaction.branchId)?.name ?? "-",
      method: transaction.payment.method,
      subtotal: transaction.subtotal,
      discount: transaction.discount.amount,
      total: transaction.total,
      profit: transactionProfit(transaction, database),
    }),
  );

  return {
    header: {
      title: "Laporan",
      subtitle: `${formatDateRange(range)} · ${
        branchScope === "all"
          ? "Semua cabang"
          : (branchById.get(branchScope)?.name ?? "Cabang")
      }`,
    },
    range,
    stats: {
      revenue,
      grossProfit,
      marginPercent: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      transactionCount,
      averageTransaction,
      totalSalesBonus,
      activeSalespeople,
    },
    paymentBreakdown,
    cashiers,
    cashDifference,
    bestSellers,
    activityLog,
    logUsers: buildLogUsers(database),
    roles: ALL_ROLES,
    transactions: transactionRows,
  };
}
