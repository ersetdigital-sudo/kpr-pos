"use server";

import { ROLE_PERMISSIONS } from "@/config/permissions";
import { getAuthSession, getAuthorizedSession } from "@/lib/auth/session";
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
import type {
  CloudActionResult,
  ImportProductPayload,
  ProductFormInput,
  ProductStockBootstrapPayload,
  ProductStockSnapshot,
  StockInInput,
  OpnameInput,
  TransferInput,
} from "@/features/produk/types";

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
  image_url: string | null;
  is_active: boolean;
}

interface StockRow {
  branch_id: string;
  product_id: string;
  quantity: number;
  min_stock: number;
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

function fail(error: unknown): CloudActionResult {
  return {
    ok: false,
    error:
      error instanceof Error
        ? error.message
        : "Layanan data belum siap. Coba lagi.",
  };
}

function canUseBranch(session: SessionState, branchId: string): boolean {
  const permissions = ROLE_PERMISSIONS[session.employee.role];
  return permissions.canViewAllBranches || branchId === session.employee.branchId;
}

async function callRpc(
  name: string,
  args: Record<string, unknown>,
): Promise<CloudActionResult> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.rpc(name, args);

    if (error) {
      console.error(`[cloud-actions] RPC ${name} gagal`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return fail(error.message);
    }

    return { ok: true };
  } catch (error) {
    console.error(`[cloud-actions] RPC ${name} terputus`, error);
    return fail(error);
  }
}

async function readSnapshot(
  session: SessionState,
): Promise<ProductStockSnapshot> {
  const admin = createSupabaseAdminClient();
  const canManageProducts =
    ROLE_PERMISSIONS[session.employee.role].canManageProducts;
  const branchId = session.branch.id;

  const [categoryResult, productResult, stockResult, stockInResult, opnameResult, transferResult] =
    await Promise.all([
      admin.from("categories").select("id,name,is_active").order("name"),
      admin
        .from("products")
        .select(
          "id,name,sku,category_id,cost_price,price,image_url,is_active",
        )
        .order("name"),
      admin
        .from("stock_levels")
        .select("branch_id,product_id,quantity,min_stock"),
      admin
        .from("stock_ins")
        .select(
          "id,branch_id,date,note,user_id,created_at,stock_in_items(product_id,product_name,quantity)",
        )
        .order("created_at", { ascending: false }),
      admin
        .from("stock_opnames")
        .select(
          "id,branch_id,date,note,user_id,created_at,stock_opname_items(product_id,product_name,system_quantity,physical_quantity,difference)",
        )
        .order("created_at", { ascending: false }),
      admin
        .from("stock_transfers")
        .select(
          "id,from_branch_id,to_branch_id,date,note,user_id,created_at,stock_transfer_items(product_id,product_name,quantity)",
        )
        .order("created_at", { ascending: false }),
    ]);

  const error =
    categoryResult.error ??
    productResult.error ??
    stockResult.error ??
    stockInResult.error ??
    opnameResult.error ??
    transferResult.error;

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
      imageUrl: row.image_url ?? undefined,
      isActive: row.is_active,
    }),
  );

  const stocks: StockLevel[] = ((stockResult.data ?? []) as StockRow[]).map(
    (row) => ({
      branchId: row.branch_id,
      productId: row.product_id,
      quantity: row.quantity,
      minStock: row.min_stock,
    }),
  );

  const stockIns: StockInRecord[] = (
    (stockInResult.data ?? []) as StockInRow[]
  )
    .filter((row) => canManageProducts || row.branch_id === branchId)
    .map((row) => ({
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
    .filter((row) => canManageProducts || row.branch_id === branchId)
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
  )
    .filter(
      (row) =>
        canManageProducts ||
        row.from_branch_id === branchId ||
        row.to_branch_id === branchId,
    )
    .map((row) => ({
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

export async function fetchProductStockSnapshotAction(): Promise<ProductStockSnapshot> {
  const session = await getAuthSession();
  if (!session) throw new Error("Sesi pengguna tidak ditemukan");
  return readSnapshot(session);
}

export async function bootstrapProductStockAction(
  payload: ProductStockBootstrapPayload,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses untuk memindahkan data produk.");

  return callRpc("fn_bootstrap_product_stock", { p_payload: payload });
}

export async function createCategoryAction(
  name: string,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses mengubah kategori.");
  return callRpc("fn_create_category", { p_name: name });
}

export async function updateCategoryAction(
  categoryId: string,
  name: string,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses mengubah kategori.");
  return callRpc("fn_update_category", { p_id: categoryId, p_name: name });
}

export async function deleteCategoryAction(
  categoryId: string,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses menghapus kategori.");
  return callRpc("fn_delete_category", { p_id: categoryId });
}

export async function createProductAction(
  input: ProductFormInput,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses menambah produk.");

  return callRpc("fn_create_product", {
    p_name: input.name,
    p_sku: input.sku,
    p_category_id: input.categoryId,
    p_cost_price: input.costPrice,
    p_price: input.price,
    p_image_url: input.imageUrl ?? "",
    p_min_stock: input.minStock,
  });
}

export async function updateProductAction(
  productId: string,
  input: ProductFormInput,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses mengubah produk.");

  return callRpc("fn_update_product", {
    p_id: productId,
    p_name: input.name,
    p_sku: input.sku,
    p_category_id: input.categoryId,
    p_cost_price: input.costPrice,
    p_price: input.price,
    p_image_url: input.imageUrl ?? "",
    p_min_stock: input.minStock,
  });
}

export async function setProductActiveAction(
  productId: string,
  isActive: boolean,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses mengubah produk.");
  return callRpc("fn_set_product_active", {
    p_id: productId,
    p_active: isActive,
  });
}

export async function deleteProductAction(
  productId: string,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses menghapus produk.");
  return callRpc("fn_delete_product", { p_id: productId });
}

export async function addStockInAction(
  branchId: string,
  input: StockInInput,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses menambah stok.");
  if (!canUseBranch(session, branchId)) return fail("Cabang tidak sesuai akses Anda.");

  return callRpc("fn_add_stock_in", {
    p_branch_id: branchId,
    p_date: input.date,
    p_note: input.note,
    p_user_id: session.employee.id,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
  });
}

export async function submitOpnameAction(
  branchId: string,
  input: OpnameInput,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses opname stok.");
  if (!canUseBranch(session, branchId)) return fail("Cabang tidak sesuai akses Anda.");

  return callRpc("fn_submit_opname", {
    p_branch_id: branchId,
    p_date: input.date,
    p_note: input.note,
    p_user_id: session.employee.id,
    p_physical: input.physical,
  });
}

export async function transferStockAction(
  branchId: string,
  input: TransferInput,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses transfer stok.");
  if (!canUseBranch(session, branchId)) return fail("Cabang tidak sesuai akses Anda.");

  return callRpc("fn_transfer_stock", {
    p_from_branch_id: branchId,
    p_to_branch_id: input.toBranchId,
    p_date: input.date,
    p_note: input.note,
    p_user_id: session.employee.id,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
  });
}

export async function importProductsAction(
  branchId: string,
  rows: readonly ImportProductPayload[],
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses import produk.");
  if (!canUseBranch(session, branchId)) return fail("Cabang tidak sesuai akses Anda.");

  return callRpc("fn_import_products", {
    p_branch_id: branchId,
    p_user_id: session.employee.id,
    p_rows: rows.map((row) => ({
      name: row.name,
      sku: row.sku,
      category_id: row.categoryId,
      cost_price: row.costPrice,
      price: row.price,
      stock: row.stock,
      min_stock: row.minStock,
    })),
  });
}

