"use client";

import { appendActivity, createId } from "@/lib/store/activity";
import { updateDatabase, useHydratedDatabase } from "@/lib/store/store";
import type {
  AppDatabase,
  Category,
  Product,
  StockLevel,
} from "@/lib/store/types";
import { formatNumber, formatRupiah } from "@/lib/format";
import { toDateInputValue } from "@/lib/date-range";
import { selectSession } from "@/features/session/data/session-repository";
import {
  applyOpname,
  applyStockIn,
  applyTransfer,
  buildOpnameItems,
  hasSalesHistory,
  validateSku,
  validateTransferItems,
} from "@/features/produk/data/produk-calculations";
import type {
  DeleteProductResult,
  ImportProductPayload,
  OpnameInput,
  ProductFormInput,
  StockInInput,
  TransferInput,
} from "@/features/produk/types";

/** Data produk mentah + riwayat stok; null sampai store ter-hydrate. */
export function useProdukData(): AppDatabase | null {
  return useHydratedDatabase();
}

function assertProductInput(input: ProductFormInput): void {
  if (!input.name.trim()) throw new Error("Nama produk wajib diisi");
  if (!input.sku.trim()) throw new Error("SKU wajib diisi");
  if (!input.categoryId) throw new Error("Kategori wajib dipilih");
  if (input.costPrice < 0) throw new Error("Harga modal tidak boleh negatif");
  if (input.price <= 0) throw new Error("Harga jual harus lebih dari 0");
  if (input.minStock < 0) throw new Error("Batas stok tidak boleh negatif");
}

function withStockLevels(
  stocks: readonly StockLevel[],
  branchIds: readonly string[],
  items: readonly { productId: string }[],
  minStock: number,
): StockLevel[] {
  const next = [...stocks];

  branchIds.forEach((branchId) => {
    items.forEach((item) => {
      const exists = next.some(
        (level) =>
          level.branchId === branchId && level.productId === item.productId,
      );

      if (!exists) {
        next.push({ branchId, productId: item.productId, quantity: 0, minStock });
      }
    });
  });

  return next;
}

export function createProduct(input: ProductFormInput): void {
  updateDatabase((database) => {
    assertProductInput(input);

    if (!validateSku(database, input.sku)) {
      throw new Error(`SKU ${input.sku} sudah dipakai produk lain`);
    }

    if (
      !database.categories.some(
        (category) => category.id === input.categoryId,
      )
    ) {
      throw new Error("Kategori tidak ditemukan");
    }

    const product: Product = {
      id: createId("prod"),
      name: input.name.trim(),
      sku: input.sku.trim().toUpperCase(),
      categoryId: input.categoryId,
      costPrice: Math.round(input.costPrice),
      price: Math.round(input.price),
      imageUrl: input.imageUrl?.trim() || undefined,
      isActive: true,
    };

    const stocks = database.branches.map((branch) => ({
      branchId: branch.id,
      productId: product.id,
      quantity: 0,
      minStock: Math.round(input.minStock),
    }));

    return appendActivity(
      {
        ...database,
        products: [product, ...database.products],
        stocks: [...database.stocks, ...stocks],
      },
      {
        action: "Membuat",
        detail: `Produk ${product.name} (${product.sku}) · ${formatRupiah(product.price)}`,
      },
    );
  });
}

export function updateProduct(
  productId: string,
  input: ProductFormInput,
): void {
  updateDatabase((database) => {
    assertProductInput(input);

    const existing = database.products.find(
      (product) => product.id === productId,
    );
    if (!existing) throw new Error("Produk tidak ditemukan");

    if (!validateSku(database, input.sku, productId)) {
      throw new Error(`SKU ${input.sku} sudah dipakai produk lain`);
    }

    return appendActivity(
      {
        ...database,
        products: database.products.map((product) =>
          product.id === productId
            ? {
                ...product,
                name: input.name.trim(),
                sku: input.sku.trim().toUpperCase(),
                categoryId: input.categoryId,
                costPrice: Math.round(input.costPrice),
                price: Math.round(input.price),
                imageUrl: input.imageUrl?.trim() || undefined,
              }
            : product,
        ),
        stocks: database.stocks.map((level) =>
          level.productId === productId
            ? { ...level, minStock: Math.round(input.minStock) }
            : level,
        ),
      },
      {
        action: "Mengubah",
        detail: `Produk ${input.name.trim()} · harga ${formatRupiah(input.price)}`,
      },
    );
  });
}

export function setProductActive(productId: string, isActive: boolean): void {
  updateDatabase((database) => {
    const product = database.products.find((item) => item.id === productId);
    if (!product) throw new Error("Produk tidak ditemukan");

    return appendActivity(
      {
        ...database,
        products: database.products.map((item) =>
          item.id === productId ? { ...item, isActive } : item,
        ),
      },
      {
        action: "Mengubah",
        detail: `Produk ${product.name} ${isActive ? "diaktifkan" : "dinonaktifkan"}`,
      },
    );
  });
}

export function deleteProduct(productId: string): DeleteProductResult {
  let result: DeleteProductResult | undefined;

  updateDatabase((database) => {
    const product = database.products.find((item) => item.id === productId);
    if (!product) throw new Error("Produk tidak ditemukan");

    if (hasSalesHistory(database, productId)) {
      result = { mode: "deactivated", name: product.name };

      return appendActivity(
        {
          ...database,
          products: database.products.map((item) =>
            item.id === productId ? { ...item, isActive: false } : item,
          ),
        },
        {
          action: "Mengubah",
          detail: `Produk ${product.name} dinonaktifkan karena sudah pernah terjual`,
        },
      );
    }

    result = { mode: "deleted", name: product.name };

    return appendActivity(
      {
        ...database,
        products: database.products.filter((item) => item.id !== productId),
        stocks: database.stocks.filter(
          (level) => level.productId !== productId,
        ),
      },
      {
        action: "Menghapus",
        detail: `Produk ${product.name} (${product.sku}) dihapus`,
      },
    );
  });

  if (!result) throw new Error("Produk gagal dihapus");
  return result;
}

export function createCategory(name: string): void {
  updateDatabase((database) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Nama kategori wajib diisi");

    const duplicate = database.categories.some(
      (category) =>
        category.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) throw new Error("Nama kategori sudah ada");

    const category: Category = {
      id: createId("cat"),
      name: trimmed,
      isActive: true,
    };

    return appendActivity(
      {
        ...database,
        categories: [...database.categories, category],
      },
      { action: "Membuat", detail: `Kategori ${category.name}` },
    );
  });
}

export function updateCategory(categoryId: string, name: string): void {
  updateDatabase((database) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Nama kategori wajib diisi");

    const product = database.categories.find(
      (category) => category.id === categoryId,
    );
    if (!product) throw new Error("Kategori tidak ditemukan");

    const duplicate = database.categories.some(
      (category) =>
        category.id !== categoryId &&
        category.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) throw new Error("Nama kategori sudah ada");

    return appendActivity(
      {
        ...database,
        categories: database.categories.map((category) =>
          category.id === categoryId
            ? { ...category, name: trimmed }
            : category,
        ),
      },
      { action: "Mengubah", detail: `Kategori ${product.name} → ${trimmed}` },
    );
  });
}

export function deleteCategory(categoryId: string): void {
  updateDatabase((database) => {
    const category = database.categories.find(
      (item) => item.id === categoryId,
    );
    if (!category) throw new Error("Kategori tidak ditemukan");

    const usedBy = database.products.filter(
      (product) => product.categoryId === categoryId,
    ).length;
    if (usedBy > 0) {
      throw new Error(
        `Kategori masih dipakai ${formatNumber(usedBy)} produk dan tidak bisa dihapus`,
      );
    }

    return appendActivity(
      {
        ...database,
        categories: database.categories.filter(
          (item) => item.id !== categoryId,
        ),
      },
      { action: "Menghapus", detail: `Kategori ${category.name}` },
    );
  });
}

export function addStockIn(input: StockInInput): void {
  updateDatabase((database) => {
    const { employee, branch } = selectSession(database);
    const items = input.items.filter((item) => item.quantity > 0);

    if (items.length === 0) throw new Error("Isi jumlah stok masuk");
    if (!input.date) throw new Error("Tanggal stok masuk wajib diisi");

    const namedItems = items.map((item) => {
      const product = database.products.find(
        (candidate) => candidate.id === item.productId,
      );
      if (!product) throw new Error("Produk tidak ditemukan");
      return {
        productId: product.id,
        productName: product.name,
        quantity: Math.round(item.quantity),
      };
    });

    const stocksWithLevels = withStockLevels(
      database.stocks,
      [branch.id],
      namedItems,
      5,
    );

    const record = {
      id: createId("si"),
      branchId: branch.id,
      items: namedItems,
      date: input.date,
      note: input.note.trim(),
      userId: employee.id,
      createdAt: new Date().toISOString(),
    };

    const total = namedItems.reduce((sum, item) => sum + item.quantity, 0);

    return appendActivity(
      {
        ...database,
        stocks: applyStockIn(stocksWithLevels, branch.id, namedItems),
        stockIns: [record, ...database.stockIns],
      },
      {
        action: "Membuat",
        detail: `Stok masuk ${formatNumber(total)} pcs · ${branch.name}`,
      },
    );
  });
}

export function submitOpname(input: OpnameInput): void {
  updateDatabase((database) => {
    const { employee, branch } = selectSession(database);

    if (!input.date) throw new Error("Tanggal opname wajib diisi");

    const invalid = Object.values(input.physical).some(
      (value) => !Number.isFinite(value) || value < 0,
    );
    if (invalid) throw new Error("Stok fisik tidak boleh negatif");

    const items = buildOpnameItems(database, branch.id, input.physical);

    if (items.length === 0) {
      throw new Error("Tidak ada selisih stok untuk dicatat");
    }

    const record = {
      id: createId("op"),
      branchId: branch.id,
      items,
      date: input.date,
      note: input.note.trim(),
      userId: employee.id,
      createdAt: new Date().toISOString(),
    };

    const difference = items.reduce(
      (total, item) => total + item.difference,
      0,
    );

    return appendActivity(
      {
        ...database,
        stocks: applyOpname(database.stocks, branch.id, items),
        stockOpnames: [record, ...database.stockOpnames],
      },
      {
        action: "Mengubah",
        detail: `Opname ${branch.name} · selisih ${difference > 0 ? "+" : ""}${formatNumber(difference)} pcs`,
      },
    );
  });
}

export function transferStock(input: TransferInput): void {
  updateDatabase((database) => {
    const { employee, branch } = selectSession(database);

    if (!input.toBranchId) throw new Error("Cabang tujuan wajib dipilih");
    if (input.toBranchId === branch.id) {
      throw new Error("Cabang tujuan harus berbeda");
    }
    if (!input.date) throw new Error("Tanggal transfer wajib diisi");

    const items = input.items.filter((item) => item.quantity > 0);
    const errors = validateTransferItems(database.stocks, branch.id, items);
    if (errors.length > 0) throw new Error(errors[0]);

    const namedItems = items.map((item) => {
      const product = database.products.find(
        (candidate) => candidate.id === item.productId,
      );
      if (!product) throw new Error("Produk tidak ditemukan");
      return {
        productId: product.id,
        productName: product.name,
        quantity: Math.round(item.quantity),
      };
    });

    const stocksWithLevels = withStockLevels(
      database.stocks,
      [branch.id, input.toBranchId],
      namedItems,
      5,
    );

    const record = {
      id: createId("tr"),
      fromBranchId: branch.id,
      toBranchId: input.toBranchId,
      items: namedItems,
      date: input.date,
      note: input.note.trim(),
      userId: employee.id,
      createdAt: new Date().toISOString(),
    };

    const total = namedItems.reduce((sum, item) => sum + item.quantity, 0);

    return appendActivity(
      {
        ...database,
        stocks: applyTransfer(
          stocksWithLevels,
          branch.id,
          input.toBranchId,
          namedItems,
        ),
        stockTransfers: [record, ...database.stockTransfers],
      },
      {
        action: "Membuat",
        detail: `Transfer ${formatNumber(total)} pcs dari ${branch.name}`,
      },
    );
  });
}

export function importProducts(rows: readonly ImportProductPayload[]): number {
  let imported = 0;

  updateDatabase((database) => {
    if (rows.length === 0) throw new Error("Tidak ada baris valid untuk diimpor");

    const { employee, branch } = selectSession(database);
    const newProducts: Product[] = [];
    const newStocks: StockLevel[] = [];
    const stockItems: { productId: string; productName: string; quantity: number }[] =
      [];

    rows.forEach((row) => {
      if (!validateSku({ ...database, products: [...database.products, ...newProducts] }, row.sku)) {
        throw new Error(`SKU ${row.sku} duplikat saat impor`);
      }

      const product: Product = {
        id: createId("prod"),
        name: row.name.trim(),
        sku: row.sku.trim().toUpperCase(),
        categoryId: row.categoryId,
        costPrice: Math.round(row.costPrice),
        price: Math.round(row.price),
        isActive: true,
      };

      newProducts.push(product);

      database.branches.forEach((targetBranch) => {
        newStocks.push({
          branchId: targetBranch.id,
          productId: product.id,
          quantity: targetBranch.id === branch.id ? Math.round(row.stock) : 0,
          minStock: Math.round(row.minStock),
        });
      });

      if (row.stock > 0) {
        stockItems.push({
          productId: product.id,
          productName: product.name,
          quantity: Math.round(row.stock),
        });
      }
    });

    imported = newProducts.length;

    const stockRecord =
      stockItems.length > 0
        ? {
            id: createId("si"),
            branchId: branch.id,
            items: stockItems,
            date: toDateInputValue(new Date()),
            note: "Stok awal dari import Excel",
            userId: employee.id,
            createdAt: new Date().toISOString(),
          }
        : null;

    return appendActivity(
      {
        ...database,
        products: [...newProducts, ...database.products],
        stocks: [...newStocks, ...database.stocks],
        stockIns: stockRecord
          ? [stockRecord, ...database.stockIns]
          : database.stockIns,
      },
      {
        action: "Membuat",
        detail: `Import Excel ${formatNumber(newProducts.length)} produk`,
      },
    );
  });

  return imported;
}
