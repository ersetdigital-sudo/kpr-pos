import "server-only";

import { syncWindowStartDate } from "@/lib/cloud/window";
import { resolveProductImageUrl } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SessionState } from "@/features/session/types";
import type {
  Category,
  Product,
  StockInRecord,
  StockLevel,
  StockOpnameRecord,
  StockTransferRecord,
} from "@/lib/store/types";
import type { ProductStockSnapshot } from "@/features/produk/types";

interface CategoryRow {
  id: string;
  name: string;
  is_active: boolean;
}

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  cost_price: number;
  price: number;
  wholesale_price: number;
  image_url: string | null;
  is_active: boolean;
}

interface StockRow {
  branch_id: string;
  product_id: string;
  quantity: number;
  min_stock: number;
  is_visible: boolean;
}

interface StockInItemRow {
  product_id: string;
  product_name: string;
  quantity: number;
}

interface StockInRow {
  id: string;
  branch_id: string;
  date: string;
  note: string;
  user_id: string;
  created_at: string;
  stock_in_items: StockInItemRow[] | null;
}

interface StockOpnameItemRow {
  product_id: string;
  product_name: string;
  system_quantity: number;
  physical_quantity: number;
  difference: number;
}

interface StockOpnameRow {
  id: string;
  branch_id: string;
  date: string;
  note: string;
  user_id: string;
  created_at: string;
  stock_opname_items: StockOpnameItemRow[] | null;
}

interface StockTransferItemRow {
  product_id: string;
  product_name: string;
  quantity: number;
}

interface StockTransferRow {
  id: string;
  from_branch_id: string;
  to_branch_id: string;
  date: string;
  note: string;
  user_id: string;
  created_at: string;
  stock_transfer_items: StockTransferItemRow[] | null;
}

/**
 * Snapshot master produk/stok untuk cache harian. Riwayat stok dibatasi
 * rentang sync supaya payload tidak tumbuh tanpa batas.
 */
export async function readProductStockSnapshot(
  session: SessionState,
): Promise<ProductStockSnapshot> {
  const admin = createSupabaseAdminClient();
  const canManageProducts = session.permissions.canManageProducts;
  const canViewAllBranches = session.permissions.canViewAllBranches;
  const seesStockHistory =
    canManageProducts || session.permissions.canViewProducts;
  const since = syncWindowStartDate();

  const [categoryResult, productResult, stockResult] = await Promise.all([
    admin.from("categories").select("id,name,is_active").order("name"),
    admin
      .from("products")
      .select(
        "id,name,sku,category_id,cost_price,price,wholesale_price,image_url,is_active",
      )
      .order("name"),
    admin
      .from("stock_levels")
      .select("branch_id,product_id,quantity,min_stock,is_visible"),
  ]);

  const error =
    categoryResult.error ?? productResult.error ?? stockResult.error;
  if (error) throw new Error(error.message);

  const categories: Category[] = (
    (categoryResult.data ?? []) as CategoryRow[]
  ).map((row) => ({
    id: row.id,
    name: row.name,
    isActive: row.is_active,
  }));

  const products: Product[] = ((productResult.data ?? []) as ProductRow[]).map(
    (row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      categoryId: row.category_id,
      costPrice: row.cost_price,
      price: row.price,
      wholesalePrice: row.wholesale_price,
      imageUrl: resolveProductImageUrl(row.image_url),
      imageKey: row.image_url ?? undefined,
      isActive: row.is_active,
    }),
  );

  const stocks: StockLevel[] = ((stockResult.data ?? []) as StockRow[]).map(
    (row) => ({
      branchId: row.branch_id,
      productId: row.product_id,
      quantity: row.quantity,
      minStock: row.min_stock,
      isVisible: row.is_visible !== false,
    }),
  );

  if (!seesStockHistory) {
    return {
      categories,
      products,
      stocks,
      stockIns: [],
      stockOpnames: [],
      stockTransfers: [],
      isEmpty: products.length === 0,
    };
  }

  // Hanya role tanpa akses semua cabang yang riwayatnya dipersempit.
  const restrictBranch = !canManageProducts && !canViewAllBranches;
  const branchScopeId = restrictBranch ? session.branch.id : null;

  let stockInQuery = admin
    .from("stock_ins")
    .select(
      "id,branch_id,date,note,user_id,created_at,stock_in_items(product_id,product_name,quantity)",
    )
    .gte("date", since)
    .order("created_at", { ascending: false });

  let opnameQuery = admin
    .from("stock_opnames")
    .select(
      "id,branch_id,date,note,user_id,created_at,stock_opname_items(product_id,product_name,system_quantity,physical_quantity,difference)",
    )
    .gte("date", since)
    .order("created_at", { ascending: false });

  let transferQuery = admin
    .from("stock_transfers")
    .select(
      "id,from_branch_id,to_branch_id,date,note,user_id,created_at,stock_transfer_items(product_id,product_name,quantity)",
    )
    .gte("date", since)
    .order("created_at", { ascending: false });

  if (branchScopeId) {
    stockInQuery = stockInQuery.eq("branch_id", branchScopeId);
    opnameQuery = opnameQuery.eq("branch_id", branchScopeId);
    transferQuery = transferQuery.or(
      `from_branch_id.eq.${branchScopeId},to_branch_id.eq.${branchScopeId}`,
    );
  }

  const [stockInResult, opnameResult, transferResult] = await Promise.all([
    stockInQuery,
    opnameQuery,
    transferQuery,
  ]);

  const recordError =
    stockInResult.error ?? opnameResult.error ?? transferResult.error;
  if (recordError) throw new Error(recordError.message);

  const stockIns: StockInRecord[] = (
    (stockInResult.data ?? []) as StockInRow[]
  ).map((row) => ({
    id: row.id,
    branchId: row.branch_id,
    items: (row.stock_in_items ?? []).map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
    })),
    date: row.date,
    note: row.note,
    userId: row.user_id,
    createdAt: row.created_at,
  }));

  const stockOpnames: StockOpnameRecord[] = (
    (opnameResult.data ?? []) as StockOpnameRow[]
  )
    .map((row) => ({
      id: row.id,
      branchId: row.branch_id,
      // Opname hanya menampilkan produk yang benar-benar berselisih.
      items: (row.stock_opname_items ?? [])
        .filter((item) => item.difference !== 0)
        .map((item) => ({
          productId: item.product_id,
          productName: item.product_name,
          systemQuantity: item.system_quantity,
          physicalQuantity: item.physical_quantity,
          difference: item.difference,
        })),
      date: row.date,
      note: row.note,
      userId: row.user_id,
      createdAt: row.created_at,
    }))
    .filter((record) => record.items.length > 0);

  const stockTransfers: StockTransferRecord[] = (
    (transferResult.data ?? []) as StockTransferRow[]
  ).map((row) => ({
    id: row.id,
    fromBranchId: row.from_branch_id,
    toBranchId: row.to_branch_id,
    items: (row.stock_transfer_items ?? []).map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
    })),
    date: row.date,
    note: row.note,
    userId: row.user_id,
    createdAt: row.created_at,
  }));

  return {
    categories,
    products,
    stocks,
    stockIns,
    stockOpnames,
    stockTransfers,
    isEmpty: products.length === 0,
  };
}
