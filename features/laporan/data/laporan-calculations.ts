import { ALL_ROLES } from "@/constants/roles";
import { formatDateRange, isWithinRange } from "@/lib/date-range";
import {
  buildProductCostLookup,
  calculateGrossProfit,
} from "@/lib/store/profit";
import {
  collectSales,
  filterSales,
  isOverdueTempoSalesOrder,
  isUnsettledSalesOrder,
  summarizeSalesBySource,
  sumSalesAmount,
  sumSalesTax,
} from "@/lib/store/sales";
import { isTransactionRefunded } from "@/lib/store/transactions";
import type { DateRange } from "@/lib/date-range";
import type { AppDatabase } from "@/lib/store/types";
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
  ReportReceivableRow,
  ReportTaxRow,
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
  const productCostById = buildProductCostLookup(database.products);

  // Omzet, laba, jumlah transaksi, dan produk terlaris memakai semua penjualan.
  // COD/Tempo ikut tercatat sejak diproses walau uangnya belum masuk.
  const sales = filterSales(
    collectSales(database, { includeUnsettled: true }),
    range,
    branchScope === "all" ? undefined : branchScope,
  );

  // Rincian metode bayar, kasir, dan selisih kas tetap dari transaksi kasir.
  const cashierTransactions = database.transactions
    .filter((transaction) => !isTransactionRefunded(transaction))
    .filter((transaction) => isInScope(transaction.branchId, branchScope))
    .filter((transaction) => isWithinRange(transaction.createdAt, range))
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    );

  const revenue = sumSalesAmount(sales);
  const taxCollected = sumSalesTax(sales);
  const taxTransactionCount = sales.filter(
    (sale) => sale.taxEnabled && sale.taxAmount > 0,
  ).length;
  // Laba kotor hanya dari barang: PPN dan ongkir tidak ikut dihitung.
  const grossProfit = sales.reduce(
    (sum, sale) =>
      sum +
      calculateGrossProfit(
        { total: sale.goodsTotal, items: sale.items },
        productCostById,
      ),
    0,
  );
  const transactionCount = sales.length;
  const averageTransaction =
    transactionCount > 0 ? Math.round(revenue / transactionCount) : 0;

  // Piutang berjalan: semua COD/Tempo yang belum lunas pada cakupan cabang,
  // termasuk yang diproses sebelum periode agar tidak ada tagihan yang hilang.
  const receivables: ReportReceivableRow[] = database.salesOrders
    .filter(isUnsettledSalesOrder)
    .filter((order) => isInScope(order.branchId, branchScope))
    .sort((first, second) => {
      const firstDue = first.dueDate ?? "9999-12-31";
      const secondDue = second.dueDate ?? "9999-12-31";
      return firstDue.localeCompare(secondDue);
    })
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      scheme: order.paymentScheme === "tempo" ? "tempo" : "cod",
      total: order.total,
      processedAt: order.processedAt ?? order.createdAt,
      dueDate: order.dueDate ?? null,
      isOverdue: isOverdueTempoSalesOrder(order),
      salesName: employeeById.get(order.salesEmployeeId)?.name ?? "Sales",
      branchName: branchById.get(order.branchId)?.name ?? "-",
    }));
  const receivableTotal = receivables.reduce(
    (total, row) => total + row.total,
    0,
  );
  const overdueReceivableTotal = receivables
    .filter((row) => row.isOverdue)
    .reduce((total, row) => total + row.total, 0);

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

  const cashierRevenue = cashierTransactions.reduce(
    (sum, transaction) => sum + transaction.total,
    0,
  );

  const paymentBreakdown: PaymentBreakdown[] = PAYMENT_METHODS.map(
    (method) => {
      const amount = cashierTransactions
        .filter((transaction) => transaction.payment.method === method)
        .reduce((sum, transaction) => sum + transaction.total, 0);

      return {
        method,
        amount,
        percent:
          cashierRevenue > 0 ? Math.round((amount / cashierRevenue) * 100) : 0,
      };
    },
  );

  const cashierTotals = new Map<string, CashierReport>();
  cashierTransactions.forEach((transaction) => {
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

  const cashDifference = cashierTransactions.reduce((total, transaction) => {
    if (transaction.payment.method !== "Cash") return total;

    return (
      total +
      ((transaction.payment.cashReceived ?? 0) -
        (transaction.payment.change ?? 0) -
        transaction.total)
    );
  }, 0);

  const soldByProduct = new Map<string, { name: string; quantity: number }>();
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
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

  const transactionRows: ReportTransactionRow[] = sales.map((sale) => ({
    invoiceNumber: sale.number,
    source: sale.source,
    createdAt: sale.at,
    cashierName: sale.cashierId
      ? (employeeById.get(sale.cashierId)?.name ?? "Kasir")
      : "-",
    branchName: branchById.get(sale.branchId)?.name ?? "-",
    method: sale.method ?? "-",
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    taxEnabled: sale.taxEnabled,
    taxRate: sale.taxRate,
    taxAmount: sale.taxAmount,
    shippingCost: sale.shippingCost,
    profit: calculateGrossProfit(
      { total: sale.goodsTotal, items: sale.items },
      productCostById,
    ),
    paymentScheme: sale.paymentScheme,
    settled: sale.settled,
    dueDate: sale.dueDate,
    status: sale.settled ? "Lunas" : "Belum lunas",
  }));

  // Riwayat batal tetap ikut rekap (nominal tidak dihitung sebagai omzet).
  const cancelledRows: ReportTransactionRow[] = database.transactions
    .filter((transaction) => isTransactionRefunded(transaction))
    .filter((transaction) => isInScope(transaction.branchId, branchScope))
    .filter((transaction) => isWithinRange(transaction.createdAt, range))
    .map((transaction) => ({
      invoiceNumber: transaction.invoiceNumber,
      source: "Kasir" as const,
      createdAt: transaction.createdAt,
      cashierName: employeeById.get(transaction.cashierId)?.name ?? "Kasir",
      branchName: branchById.get(transaction.branchId)?.name ?? "-",
      method: transaction.payment.method,
      subtotal: transaction.subtotal,
      discount: transaction.discount.amount,
      total: transaction.total,
      taxEnabled: transaction.taxEnabled,
      taxRate: transaction.taxRate,
      taxAmount: transaction.taxAmount,
      shippingCost: transaction.shippingCost,
      profit: 0,
      paymentScheme: "cash" as const,
      settled: false,
      dueDate: null,
      status: "Batal" as const,
    }));

  const cancelledOrders: ReportTransactionRow[] = database.salesOrders
    .filter((order) => order.status === "Dibatalkan" && !order.transactionId)
    .filter((order) => isInScope(order.branchId, branchScope))
    .filter((order) => isWithinRange(order.createdAt, range))
    .map((order) => ({
      invoiceNumber: order.orderNumber,
      source: "Pesanan Sales" as const,
      createdAt: order.createdAt,
      cashierName: "-",
      branchName: branchById.get(order.branchId)?.name ?? "-",
      method: "-" as const,
      subtotal: order.items.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      ),
      discount: order.items.reduce(
        (total, item) => total + (item.discountAmount ?? 0),
        0,
      ),
      total: order.total,
      taxEnabled: order.taxEnabled,
      taxRate: order.taxRate,
      taxAmount: order.taxAmount,
      shippingCost: order.shippingCost,
      profit: 0,
      paymentScheme: order.paymentScheme ?? ("cash" as const),
      settled: false,
      dueDate: order.dueDate ?? null,
      status: "Batal" as const,
    }));

  transactionRows.push(...cancelledRows, ...cancelledOrders);
  transactionRows.sort(
    (first, second) =>
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime(),
  );

  const orderById = new Map(
    database.salesOrders.map((order) => [order.id, order]),
  );
  const taxRecap: ReportTaxRow[] = sales
    .filter((sale) => sale.taxEnabled && sale.taxAmount > 0)
    .map((sale) => ({
      id: sale.id,
      number: sale.number,
      source: sale.source,
      at: sale.at,
      customerName:
        sale.source === "Pesanan Sales"
          ? (orderById.get(sale.id)?.customerName ?? null)
          : null,
      cashierName: sale.cashierId
        ? (employeeById.get(sale.cashierId)?.name ?? "Kasir")
        : null,
      branchName: branchById.get(sale.branchId)?.name ?? "-",
      taxBase: sale.goodsTotal,
      taxRate: sale.taxRate,
      taxAmount: sale.taxAmount,
    }));

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
      taxCollected,
      taxTransactionCount,
      grossProfit,
      marginPercent: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      transactionCount,
      averageTransaction,
      totalSalesBonus,
      activeSalespeople,
      receivableTotal,
      receivableCount: receivables.length,
      overdueReceivableTotal,
    },
    sourceBreakdown: summarizeSalesBySource(sales),
    paymentBreakdown,
    cashiers,
    cashDifference,
    bestSellers,
    activityLog,
    logUsers: buildLogUsers(database),
    roles: ALL_ROLES,
    transactions: transactionRows,
    taxRecap,
    receivables,
  };
}
