"use client";

import { recordActivity } from "@/lib/store/activity";
import { getDatabase, useHydratedDatabase } from "@/lib/store/store";
import { formatNumber, formatRupiah } from "@/lib/format";
import { selectSession } from "@/features/session/data/session-repository";
import { hasSalesHistory } from "@/features/produk/data/produk-calculations";
import {
  syncAppFromCloud,
  trackCloudWrite,
} from "@/features/sync/data/app-sync";
import {
  addStockInAction,
  createCategoryAction,
  createProductAction,
  deleteCategoryAction,
  deleteProductAction,
  importProductsAction,
  setProductActiveAction,
  submitOpnameAction,
  transferStockAction,
  updateCategoryAction,
  updateProductAction,
} from "@/features/produk/cloud-actions";
import { uploadProductPhotoAction } from "@/features/produk/photo-actions";
import type { AppDatabase } from "@/lib/store/types";
import type {
  CloudActionResult,
  DeleteProductResult,
  ImportProductPayload,
  OpnameInput,
  ProductFormInput,
  ProductPhotoUploadResult,
  StockInInput,
  TransferInput,
} from "@/features/produk/types";

/** Data produk mentah + riwayat stok; null sampai store ter-hydrate. */
export function useProdukData(): AppDatabase | null {
  return useHydratedDatabase();
}

function assertOk(result: CloudActionResult): void {
  if (!result.ok) throw new Error(result.error);
}

export async function uploadProductPhoto(
  file: File,
  productId?: string,
): Promise<ProductPhotoUploadResult> {
  const formData = new FormData();
  formData.set("file", file);
  if (productId) formData.set("productId", productId);
  return uploadProductPhotoAction(formData);
}

async function refreshAfterWrite(): Promise<void> {
  try {
    await syncAppFromCloud({ force: true });
  } catch (error) {
    console.error("Sinkronisasi setelah simpan produk/stok gagal:", error);
  }
}

export async function createProduct(input: ProductFormInput): Promise<void> {
  const result = await trackCloudWrite(() => createProductAction(input));
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Membuat",
    detail: `Produk ${input.name.trim()} (${input.sku.trim().toUpperCase()}) · ${formatRupiah(input.price)}`,
  });
}

export async function updateProduct(
  productId: string,
  input: ProductFormInput,
): Promise<void> {
  const result = await trackCloudWrite(() =>
    updateProductAction(productId, input),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: `Produk ${input.name.trim()} · harga ${formatRupiah(input.price)}`,
  });
}

export async function setProductActive(
  productId: string,
  isActive: boolean,
): Promise<void> {
  const result = await trackCloudWrite(() =>
    setProductActiveAction(productId, isActive),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: `Produk ${isActive ? "diaktifkan" : "dinonaktifkan"}`,
  });
}

export async function deleteProduct(
  productId: string,
): Promise<DeleteProductResult> {
  const database = getDatabase();
  const product = database.products.find((item) => item.id === productId);

  if (!product) throw new Error("Produk tidak ditemukan");

  const sold = hasSalesHistory(database, productId);
  const result = await trackCloudWrite(() =>
    sold
      ? setProductActiveAction(productId, false)
      : deleteProductAction(productId),
  );

  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: sold ? "Mengubah" : "Menghapus",
    detail: sold
      ? `Produk ${product.name} dinonaktifkan karena sudah pernah terjual`
      : `Produk ${product.name} (${product.sku}) dihapus`,
  });

  return {
    mode: sold ? "deactivated" : "deleted",
    name: product.name,
  };
}

export async function createCategory(name: string): Promise<void> {
  const trimmed = name.trim();
  const result = await trackCloudWrite(() => createCategoryAction(trimmed));
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({ action: "Membuat", detail: `Kategori ${trimmed}` });
}

export async function updateCategory(
  categoryId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  const database = getDatabase();
  const previous = database.categories.find(
    (category) => category.id === categoryId,
  );

  const result = await trackCloudWrite(() =>
    updateCategoryAction(categoryId, trimmed),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: `Kategori ${previous?.name ?? categoryId} → ${trimmed}`,
  });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const database = getDatabase();
  const category = database.categories.find((item) => item.id === categoryId);
  const result = await trackCloudWrite(() =>
    deleteCategoryAction(categoryId),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Menghapus",
    detail: `Kategori ${category?.name ?? categoryId}`,
  });
}

export async function addStockIn(input: StockInInput): Promise<void> {
  const { branch } = selectSession(getDatabase());
  const total = input.items.reduce((sum, item) => sum + item.quantity, 0);
  const result = await trackCloudWrite(() =>
    addStockInAction(branch.id, input),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Membuat",
    detail: `Stok masuk ${formatNumber(total)} pcs · ${branch.name}`,
  });
}

export async function submitOpname(input: OpnameInput): Promise<void> {
  const { branch } = selectSession(getDatabase());
  const result = await trackCloudWrite(() =>
    submitOpnameAction(branch.id, input),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: `Opname ${branch.name} · ${input.date}`,
  });
}

export async function transferStock(input: TransferInput): Promise<void> {
  const database = getDatabase();
  const { branch } = selectSession(database);
  const target = database.branches.find(
    (item) => item.id === input.toBranchId,
  );
  const total = input.items.reduce((sum, item) => sum + item.quantity, 0);

  const result = await trackCloudWrite(() =>
    transferStockAction(branch.id, input),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Membuat",
    detail: `Transfer ${formatNumber(total)} pcs dari ${branch.name} ke ${target?.name ?? "cabang tujuan"}`,
  });
}

export async function importProducts(
  rows: readonly ImportProductPayload[],
): Promise<number> {
  const { branch } = selectSession(getDatabase());
  const result = await trackCloudWrite(() =>
    importProductsAction(branch.id, rows),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Membuat",
    detail: `Import Excel ${formatNumber(rows.length)} produk · ${branch.name}`,
  });
  return rows.length;
}
