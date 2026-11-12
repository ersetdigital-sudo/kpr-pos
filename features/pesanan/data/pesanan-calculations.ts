import { ROLES } from "@/constants/roles";
import type { DateRange } from "@/lib/date-range";
import { isWithinRange } from "@/lib/date-range";
import { getNextDailyDocumentNumber } from "@/lib/document-number";
import { formatPercent, formatRupiah } from "@/lib/format";
import { isCountedSalesOrder } from "@/lib/store/sales";
import { isTransactionRefunded } from "@/lib/store/transactions";
import type {
  AppDatabase,
  Employee,
  SalesBonusSettings,
  SalesOrder,
  SalesOrderStatus,
  StockLevel,
} from "@/lib/store/types";
import type {
  BonusEntry,
  LeaderboardEntry,
  OrderProductOption,
  OrderRow,
  SalesEmployeeOption,
  SalesStats,
} from "@/features/pesanan/types";

export function getOrderQuantity(order: SalesOrder): number {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

/** Bonus dihitung dari total pcs dalam periode, sesuai tipe aturan di pengaturan. */
export function calculateBonusAmount(
  quantity: number,
  nominal: number,
  settings: SalesBonusSettings,
): number {
  if (quantity <= 0) return 0;

  if (settings.type === "percent") {
    return Math.round((nominal * settings.percentRate) / 100);
  }

  if (settings.type === "tiered") {
    const tier = [...settings.tiers]
      .sort((first, second) => second.minQuantity - first.minQuantity)
      .find((item) => quantity >= item.minQuantity);

    return tier ? Math.round(quantity * tier.amountPerPiece) : 0;
  }

  return Math.round(quantity * settings.perPieceAmount);
}

export function describeBonusRule(settings: SalesBonusSettings): string {
  if (settings.type === "percent") {
    return `${formatPercent(settings.percentRate)} dari nominal`;
  }

  if (settings.type === "tiered") {
    const topTier = [...settings.tiers].sort(
      (first, second) => second.minQuantity - first.minQuantity,
    )[0];

    return topTier
      ? `Bertingkat s/d ${formatRupiah(topTier.amountPerPiece)}/pcs`
      : "Bertingkat";
  }

  return `${formatRupiah(settings.perPieceAmount)} per pcs`;
}

export function collectBonusEntries(
  database: AppDatabase,
  range: DateRange,
  branchId?: string,
): BonusEntry[] {
  const salesEmployees = database.employees.filter(
    (employee) => employee.role === ROLES.SALES && employee.isActive,
  );
  const totals = new Map<string, BonusEntry>();

  salesEmployees.forEach((employee) => {
    totals.set(employee.id, {
      salesEmployeeId: employee.id,
      salesName: employee.name,
      orderCount: 0,
      quantity: 0,
      nominal: 0,
      bonus: 0,
    });
  });

  database.salesOrders.forEach((order) => {
    if (!isCountedSalesOrder(order)) return;
    if (branchId && order.branchId !== branchId) return;

    // Bonus mengikuti tanggal lunas, bukan tanggal pesanan dibuat.
    const paidAt = order.paidAt ?? order.createdAt;
    if (!isWithinRange(paidAt, range)) return;

    const entry = totals.get(order.salesEmployeeId);
    if (!entry) return;

    entry.orderCount += 1;
    entry.quantity += getOrderQuantity(order);
    entry.nominal += order.total;
  });

  database.transactions.forEach((transaction) => {
    if (isTransactionRefunded(transaction)) return;
    if (!transaction.salesEmployeeId) return;
    if (branchId && transaction.branchId !== branchId) return;
    if (!isWithinRange(transaction.createdAt, range)) return;

    const entry = totals.get(transaction.salesEmployeeId);
    if (!entry) return;

    entry.orderCount += 1;
    entry.quantity += transaction.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    entry.nominal += transaction.total;
  });

  return [...totals.values()].map((entry) => ({
    ...entry,
    bonus: calculateBonusAmount(
      entry.quantity,
      entry.nominal,
      database.settings.salesBonus,
    ),
  }));
}

export function buildLeaderboard(
  entries: readonly BonusEntry[],
  currentEmployeeId: string,
): LeaderboardEntry[] {
  return [...entries]
    .sort(
      (first, second) =>
        second.bonus - first.bonus ||
        second.quantity - first.quantity ||
        first.salesName.localeCompare(second.salesName),
    )
    .map((entry, index) => ({
      rank: index + 1,
      salesEmployeeId: entry.salesEmployeeId,
      salesName: entry.salesName,
      orderCount: entry.orderCount,
      soldCount: entry.quantity,
      bonus: entry.bonus,
      isCurrentUser: entry.salesEmployeeId === currentEmployeeId,
    }));
}

export function calculateSalesStats(
  entries: readonly BonusEntry[],
  leaderboard: readonly LeaderboardEntry[],
  currentEmployeeId: string,
  awaitingPaymentCount: number,
  settings: SalesBonusSettings,
): SalesStats {
  const ownEntry = entries.find(
    (entry) => entry.salesEmployeeId === currentEmployeeId,
  );
  const ownRank =
    leaderboard.find((entry) => entry.salesEmployeeId === currentEmployeeId)
      ?.rank ?? 0;

  return {
    soldThisMonth: ownEntry?.quantity ?? 0,
    rank: ownRank,
    totalSalespeople: entries.length,
    runningBonus: ownEntry?.bonus ?? 0,
    bonusRuleLabel: describeBonusRule(settings),
    awaitingPaymentCount,
  };
}

export function getVisibleOrders(
  database: AppDatabase,
  employee: Employee,
): SalesOrder[] {
  if (employee.role === ROLES.SALES) {
    return database.salesOrders.filter(
      (order) => order.salesEmployeeId === employee.id,
    );
  }

  return database.salesOrders;
}

export function buildOrderRows(
  database: AppDatabase,
  employee: Employee,
): OrderRow[] {
  const employeeById = new Map(
    database.employees.map((item) => [item.id, item]),
  );
  const branchById = new Map(
    database.branches.map((branch) => [branch.id, branch]),
  );

  return getVisibleOrders(database, employee)
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      branchId: order.branchId,
      branchName: branchById.get(order.branchId)?.name ?? "-",
      salesEmployeeId: order.salesEmployeeId,
      salesName: employeeById.get(order.salesEmployeeId)?.name ?? "Sales",
      quantity: getOrderQuantity(order),
      total: order.total,
      status: order.status,
      transactionId: order.transactionId ?? null,
      note: order.note,
      createdAt: order.createdAt,
    }))
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    );
}

export function countAwaitingPayment(
  orders: readonly SalesOrder[],
): number {
  return orders.filter(
    (order) =>
      order.status === "Menunggu bayar" || order.status === "Belum sinkron",
  ).length;
}

export function buildProductOptions(
  database: AppDatabase,
  branchId: string,
): OrderProductOption[] {
  return database.products
    .filter((product) => product.isActive)
    .map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      wholesalePrice: product.wholesalePrice ?? 0,
      stock:
        database.stocks.find(
          (level) =>
            level.branchId === branchId && level.productId === product.id,
        )?.quantity ?? 0,
    }));
}

export function buildSalesOptions(
  database: AppDatabase,
): SalesEmployeeOption[] {
  return database.employees
    .filter(
      (employee) => employee.role === ROLES.SALES && employee.isActive,
    )
    .map((employee) => ({
      id: employee.id,
      name: employee.name,
      branchId: employee.branchId,
    }));
}

export function getNextOrderNumber(
  orders: readonly SalesOrder[],
  date: Date = new Date(),
): string {
  return getNextDailyDocumentNumber(
    orders.map((order) => order.orderNumber),
    "SO",
    date,
  );
}

export function getStockShortage(
  database: AppDatabase,
  order: SalesOrder,
): string | null {
  for (const item of order.items) {
    const stock = database.stocks.find(
      (level) =>
        level.branchId === order.branchId &&
        level.productId === item.productId,
    );

    if (!stock || stock.quantity < item.quantity) {
      return `Stok ${item.productName} tersisa ${stock?.quantity ?? 0} pcs`;
    }
  }

  return null;
}

export function applyOrderStock(
  stocks: readonly StockLevel[],
  order: SalesOrder,
): StockLevel[] {
  return stocks.map((level) => {
    if (level.branchId !== order.branchId) return level;

    const item = order.items.find(
      (entry) => entry.productId === level.productId,
    );
    if (!item) return level;

    return { ...level, quantity: level.quantity - item.quantity };
  });
}

export function restoreOrderStock(
  stocks: readonly StockLevel[],
  order: SalesOrder,
): StockLevel[] {
  return stocks.map((level) => {
    if (level.branchId !== order.branchId) return level;

    const item = order.items.find(
      (entry) => entry.productId === level.productId,
    );
    if (!item) return level;

    return { ...level, quantity: level.quantity + item.quantity };
  });
}

const ORDER_STATUS_TRANSITIONS: Record<
  SalesOrderStatus,
  readonly SalesOrderStatus[]
> = {
  "Belum sinkron": ["Menunggu bayar", "Dibatalkan"],
  "Menunggu bayar": ["Lunas", "Dibatalkan"],
  Lunas: ["Dibatalkan"],
  Dibatalkan: [],
};

/** Status tujuan yang valid dari status pesanan saat ini. */
export function getNextOrderStatuses(
  status: SalesOrderStatus,
): readonly SalesOrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[status];
}

export function canChangeOrderStatus(
  current: SalesOrderStatus,
  next: SalesOrderStatus,
): boolean {
  return ORDER_STATUS_TRANSITIONS[current].includes(next);
}
