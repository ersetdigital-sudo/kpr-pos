import {
  bootstrapProductStockAction,
  fetchProductStockSnapshotAction,
} from "@/features/produk/cloud-actions";
import {
  getDatabase,
  hasStoredDatabase,
  updateDatabase,
} from "@/lib/store/store";
import type { AppDatabase } from "@/lib/store/types";
import type {
  ProductStockBootstrapPayload,
  ProductStockSnapshot,
} from "@/features/produk/types";

let inFlight: Promise<void> | null = null;

function buildBootstrapPayload(
  database: AppDatabase,
): ProductStockBootstrapPayload {
  return {
    branches: database.branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      is_active: branch.isActive,
    })),
    employees: database.employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      phone: employee.phone,
      initials: employee.initials,
      role: employee.role,
      branch_id: employee.branchId,
      is_active: employee.isActive,
    })),
    categories: database.categories.map((category) => ({
      id: category.id,
      name: category.name,
      is_active: category.isActive,
    })),
    products: database.products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category_id: product.categoryId,
      cost_price: product.costPrice,
      price: product.price,
      image_url: product.imageUrl ?? null,
      is_active: product.isActive,
    })),
    stock_levels: database.stocks.map((stock) => ({
      branch_id: stock.branchId,
      product_id: stock.productId,
      quantity: stock.quantity,
      min_stock: stock.minStock,
    })),
    stock_ins: database.stockIns.map((record) => ({
      id: record.id,
      branch_id: record.branchId,
      date: record.date,
      note: record.note,
      user_id: record.userId,
      created_at: record.createdAt,
    })),
    stock_in_items: database.stockIns.flatMap((record) =>
      record.items.map((item) => ({
        stock_in_id: record.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
      })),
    ),
    stock_opnames: database.stockOpnames.map((record) => ({
      id: record.id,
      branch_id: record.branchId,
      date: record.date,
      note: record.note,
      user_id: record.userId,
      created_at: record.createdAt,
    })),
    stock_opname_items: database.stockOpnames.flatMap((record) =>
      record.items.map((item) => ({
        opname_id: record.id,
        product_id: item.productId,
        product_name: item.productName,
        system_quantity: item.systemQuantity,
        physical_quantity: item.physicalQuantity,
        difference: item.difference,
      })),
    ),
    stock_transfers: database.stockTransfers.map((record) => ({
      id: record.id,
      from_branch_id: record.fromBranchId,
      to_branch_id: record.toBranchId,
      date: record.date,
      note: record.note,
      user_id: record.userId,
      created_at: record.createdAt,
    })),
    stock_transfer_items: database.stockTransfers.flatMap((record) =>
      record.items.map((item) => ({
        transfer_id: record.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
      })),
    ),
  };
}

function applySnapshot(snapshot: ProductStockSnapshot): void {
  updateDatabase((database) => ({
    ...database,
    categories: snapshot.categories,
    products: snapshot.products,
    stocks: snapshot.stocks,
    stockIns: snapshot.stockIns,
    stockOpnames: snapshot.stockOpnames,
    stockTransfers: snapshot.stockTransfers,
  }));
}

interface SyncOptions {
  canBootstrap?: boolean;
  /** Tunggu sync yang sedang jalan lalu tarik snapshot baru. */
  force?: boolean;
}

/**
 * Tarik master produk/stok dari Supabase. Jika cloud masih kosong dan user
 * berwenang, data lokal yang ada di-upload sekali sebagai bootstrap.
 */
export function syncProductStockFromCloud(
  options: SyncOptions = {},
): Promise<void> {
  if (inFlight) {
    if (!options.force) return inFlight;

    return inFlight
      .catch(() => undefined)
      .then(() => syncProductStockFromCloud({ ...options, force: false }));
  }

  inFlight = (async () => {
    let snapshot = await fetchProductStockSnapshotAction();

    if (snapshot.isEmpty) {
      const database = getDatabase();
      const stored = hasStoredDatabase();

      // Perangkat baru tanpa data lama tidak boleh mengunggah data demo.
      if (options.canBootstrap && stored && database.products.length > 0) {
        const result = await bootstrapProductStockAction(
          buildBootstrapPayload(database),
        );

        if (!result.ok) {
          throw new Error(result.error);
        }

        snapshot = await fetchProductStockSnapshotAction();
      } else if (!stored) {
        // Perangkat baru cukup menampilkan katalog kosong sampai cloud terisi.
        applySnapshot(snapshot);
      }
    }

    if (!snapshot.isEmpty) {
      applySnapshot(snapshot);
    }
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
