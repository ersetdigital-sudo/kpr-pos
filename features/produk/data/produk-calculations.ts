import type {
  AppDatabase,
  StockLevel,
  StockOpnameItem,
} from "@/lib/store/types";
import type {
  CategoryUsage,
  ProductFilters,
  ProductPagination,
  ProductRow,
  ProductStats,
  StockScope,
  StockStatus,
  StockInFormItem,
} from "@/features/produk/types";

export function getStockStatus(
  quantity: number,
  minStock: number,
  isActive = true,
): StockStatus {
  if (!isActive) return "Nonaktif";
  if (quantity <= 0) return "Habis";
  if (quantity <= minStock) return "Menipis";
  return "Aman";
}

export function getScopedStock(
  stocks: readonly StockLevel[],
  productId: string,
  scope: StockScope,
): { quantity: number; minStock: number } {
  const levels = stocks.filter(
    (level) =>
      level.productId === productId &&
      (scope === "all" || level.branchId === scope),
  );

  if (levels.length === 0) return { quantity: 0, minStock: 0 };

  return {
    quantity: levels.reduce((total, level) => total + level.quantity, 0),
    minStock: Math.max(...levels.map((level) => level.minStock)),
  };
}

export function buildProductRows(
  database: AppDatabase,
  filters: ProductFilters,
): { rows: ProductRow[]; pagination: ProductPagination } {
  const categoryById = new Map(
    database.categories.map((category) => [category.id, category]),
  );
  const keyword = filters.search.trim().toLowerCase();

  const allRows: ProductRow[] = database.products.map((product) => {
    const stock = getScopedStock(
      database.stocks,
      product.id,
      filters.branchId,
    );

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      categoryName:
        categoryById.get(product.categoryId)?.name ?? "Tanpa kategori",
      costPrice: product.costPrice,
      price: product.price,
      imageUrl: product.imageUrl,
      stock: stock.quantity,
      minStock: stock.minStock,
      status: getStockStatus(stock.quantity, stock.minStock, product.isActive),
      isActive: product.isActive,
    };
  });

  const filtered = allRows.filter((row) => {
    if (row.status === "Nonaktif" && filters.status !== "Nonaktif") {
      return false;
    }
    if (filters.status === "Nonaktif" && row.isActive) return false;
    if (
      filters.status !== "all" &&
      filters.status !== "Nonaktif" &&
      row.status !== filters.status
    ) {
      return false;
    }
    if (
      filters.categoryId !== "all" &&
      row.categoryId !== filters.categoryId
    ) {
      return false;
    }
    if (
      keyword &&
      !row.name.toLowerCase().includes(keyword) &&
      !row.sku.toLowerCase().includes(keyword)
    ) {
      return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const page = Math.min(Math.max(1, filters.page), totalPages);
  const start = (page - 1) * filters.pageSize;

  return {
    rows: filtered.slice(start, start + filters.pageSize),
    pagination: {
      page,
      pageSize: filters.pageSize,
      total,
      totalPages,
    },
  };
}

export function calculateProductStats(
  database: AppDatabase,
  scope: StockScope,
  today: Date,
): ProductStats {
  const activeProducts = database.products.filter(
    (product) => product.isActive,
  );

  let totalStockValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  activeProducts.forEach((product) => {
    const stock = getScopedStock(database.stocks, product.id, scope);
    totalStockValue += stock.quantity * product.costPrice;

    const status = getStockStatus(stock.quantity, stock.minStock);
    if (status === "Habis") outOfStockCount += 1;
    if (status === "Menipis") lowStockCount += 1;
  });

  return {
    totalStockValue,
    lowStockCount,
    outOfStockCount,
    incomingThisWeek: calculateIncomingThisWeek(database, scope, today),
    totalProducts: activeProducts.length,
  };
}

export function calculateIncomingThisWeek(
  database: AppDatabase,
  scope: StockScope,
  today: Date,
): number {
  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  return database.stockIns
    .filter((record) => {
      if (scope !== "all" && record.branchId !== scope) return false;
      const time = new Date(`${record.date}T00:00:00`).getTime();
      return time >= weekStart.getTime() && time <= today.getTime();
    })
    .reduce(
      (total, record) =>
        total +
        record.items.reduce((sum, item) => sum + item.quantity, 0),
      0,
    );
}

export function buildCategoryUsage(database: AppDatabase): CategoryUsage[] {
  return database.categories.map((category) => ({
    category,
    productCount: database.products.filter(
      (product) => product.categoryId === category.id,
    ).length,
  }));
}

export function buildOpnameItems(
  database: AppDatabase,
  branchId: string,
  physical: Record<string, number>,
): StockOpnameItem[] {
  return database.products
    .filter((product) => product.isActive)
    .map((product) => {
      const stock = database.stocks.find(
        (level) =>
          level.branchId === branchId && level.productId === product.id,
      );
      const systemQuantity = stock?.quantity ?? 0;
      const physicalQuantity = physical[product.id] ?? systemQuantity;

      return {
        productId: product.id,
        productName: product.name,
        systemQuantity,
        physicalQuantity,
        difference: physicalQuantity - systemQuantity,
      };
    })
    .filter((item) => item.difference !== 0);
}

export function validateTransferItems(
  stocks: readonly StockLevel[],
  fromBranchId: string,
  items: readonly StockInFormItem[],
): string[] {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push("Tambahkan minimal satu produk untuk dipindahkan.");
  }

  items.forEach((item) => {
    if (item.quantity <= 0) {
      errors.push("Jumlah transfer harus lebih dari 0.");
      return;
    }

    const stock = stocks.find(
      (level) =>
        level.branchId === fromBranchId && level.productId === item.productId,
    );

    if (!stock || item.quantity > stock.quantity) {
      errors.push(
        `Stok asal tidak cukup (tersedia ${stock?.quantity ?? 0} pcs).`,
      );
    }
  });

  return [...new Set(errors)];
}

export function applyStockIn(
  stocks: readonly StockLevel[],
  branchId: string,
  items: readonly StockInFormItem[],
): StockLevel[] {
  return stocks.map((level) => {
    if (level.branchId !== branchId) return level;

    const item = items.find((entry) => entry.productId === level.productId);
    if (!item) return level;

    return { ...level, quantity: level.quantity + item.quantity };
  });
}

export function applyOpname(
  stocks: readonly StockLevel[],
  branchId: string,
  items: readonly StockOpnameItem[],
): StockLevel[] {
  return stocks.map((level) => {
    if (level.branchId !== branchId) return level;

    const item = items.find((entry) => entry.productId === level.productId);
    if (!item) return level;

    return { ...level, quantity: item.physicalQuantity };
  });
}

export function applyTransfer(
  stocks: readonly StockLevel[],
  fromBranchId: string,
  toBranchId: string,
  items: readonly StockInFormItem[],
): StockLevel[] {
  const withReducedSource = stocks.map((level) => {
    if (level.branchId !== fromBranchId) return level;

    const item = items.find((entry) => entry.productId === level.productId);
    if (!item) return level;

    return { ...level, quantity: level.quantity - item.quantity };
  });

  return withReducedSource.map((level) => {
    if (level.branchId !== toBranchId) return level;

    const item = items.find((entry) => entry.productId === level.productId);
    if (!item) return level;

    return { ...level, quantity: level.quantity + item.quantity };
  });
}

export function hasSalesHistory(
  database: AppDatabase,
  productId: string,
): boolean {
  const inTransactions = database.transactions.some((transaction) =>
    transaction.items.some((item) => item.productId === productId),
  );
  const inOrders = database.salesOrders.some((order) =>
    order.items.some((item) => item.productId === productId),
  );

  return inTransactions || inOrders;
}

export function validateSku(
  database: AppDatabase,
  sku: string,
  excludeProductId?: string,
): boolean {
  const normalized = sku.trim().toLowerCase();

  return !database.products.some(
    (product) =>
      product.id !== excludeProductId &&
      product.sku.trim().toLowerCase() === normalized,
  );
}
