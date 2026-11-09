"use server";

import { getAuthorizedSession } from "@/lib/auth/session";
import { deleteR2ObjectBestEffort } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SessionState } from "@/features/session/types";
import type {
  CloudActionResult,
  ImportProductPayload,
  ProductFormInput,
  StockInInput,
  OpnameInput,
  TransferInput,
} from "@/features/produk/types";

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
  return (
    session.permissions.canViewAllBranches ||
    branchId === session.employee.branchId
  );
}

/** Foto lama dibaca sebelum diubah/dihapus agar object R2 bisa dibersihkan. */
async function readProductImageUrl(productId: string): Promise<string | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("products")
      .select("image_url")
      .eq("id", productId)
      .maybeSingle();

    if (error) return null;
    return (data as { image_url: string | null } | null)?.image_url ?? null;
  } catch {
    return null;
  }
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
    p_wholesale_price: input.wholesalePrice,
  });
}

export async function updateProductAction(
  productId: string,
  input: ProductFormInput,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return fail("Anda tidak punya akses mengubah produk.");

  const previousImage = await readProductImageUrl(productId);

  const result = await callRpc("fn_update_product", {
    p_id: productId,
    p_name: input.name,
    p_sku: input.sku,
    p_category_id: input.categoryId,
    p_cost_price: input.costPrice,
    p_price: input.price,
    p_image_url: input.imageUrl ?? "",
    p_min_stock: input.minStock,
    p_wholesale_price: input.wholesalePrice,
  });

  if (result.ok && previousImage && previousImage !== (input.imageUrl ?? "")) {
    await deleteR2ObjectBestEffort(previousImage);
  }

  return result;
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

  const previousImage = await readProductImageUrl(productId);
  const result = await callRpc("fn_delete_product", { p_id: productId });

  if (result.ok) await deleteR2ObjectBestEffort(previousImage);

  return result;
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

