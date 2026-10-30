import { ROLES } from "@/constants/roles";
import type { DateRange } from "@/lib/date-range";
import { isWithinRange } from "@/lib/date-range";
import { formatPercent, formatRupiah } from "@/lib/format";
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
    if (order.status !== "Lunas") return;
    if (branchId && order.branchId !== branchId) return;
    if (!isWithinRange(order.createdAt, range)) return;

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
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const prefix = `SO-${day}${month}-`;

  const highest = orders.reduce((max, order) => {
    if (!order.orderNumber.startsWith(prefix)) return max;
    const sequence = Number(order.orderNumber.slice(prefix.length));
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);

  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
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

export const ORDER_STATUS_OPTIONS: readonly SalesOrderStatus[] = [
  "Menunggu bayar",
  "Lunas",
  "Dibatalkan",
  "Belum sinkron",
];
