"use client";

import type { AppDatabase, Category } from "@/lib/store/types";
import type {
  ImportProductPayload,
  ImportProductRow,
} from "@/features/produk/types";
import { validateSku } from "@/features/produk/data/produk-calculations";

const TEMPLATE_HEADERS = [
  "Nama Produk",
  "SKU",
  "Kategori",
  "Harga Modal",
  "Harga Jual",
  "Stok Awal",
  "Stok Minimum",
] as const;

type TemplateHeader = (typeof TEMPLATE_HEADERS)[number];

const HEADER_ALIASES: Record<TemplateHeader, string[]> = {
  "Nama Produk": ["nama produk", "nama"],
  SKU: ["sku", "kode"],
  Kategori: ["kategori"],
  "Harga Modal": ["harga modal", "modal"],
  "Harga Jual": ["harga jual", "harga"],
  "Stok Awal": ["stok awal", "stok"],
  "Stok Minimum": ["stok minimum", "batas stok", "min stok"],
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function readCell(
  row: Record<string, unknown>,
  aliases: readonly string[],
): unknown {
  const entry = Object.entries(row).find(([header]) =>
    aliases.includes(normalizeHeader(header)),
  );

  return entry?.[1] ?? "";
}

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;

  const text = String(value ?? "").trim();
  if (!text) return 0;

  const digits = text.replace(/[^\d-]/g, "");
  return digits ? Number(digits) : Number.NaN;
}

function isRowEmpty(row: Record<string, unknown>): boolean {
  return Object.values(row).every((value) => String(value ?? "").trim() === "");
}

export async function downloadProductTemplate(
  categories: readonly Category[],
): Promise<void> {
  const XLSX = await import("xlsx");

  const sheet = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS]]);
  sheet["!cols"] = [
    { wch: 28 },
    { wch: 16 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
  ];

  const categorySheet = XLSX.utils.aoa_to_sheet([
    ["Kategori yang tersedia"],
    ...categories.map((category) => [category.name]),
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Produk");
  XLSX.utils.book_append_sheet(workbook, categorySheet, "Kategori");
  XLSX.writeFile(workbook, "template-import-produk.xlsx");
}

export async function parseProductFile(
  file: File,
  database: AppDatabase,
): Promise<ImportProductRow[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("File Excel tidak memiliki sheet data");
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (rawRows.length === 0) {
    throw new Error("Sheet produk masih kosong");
  }

  const firstRow = rawRows[0] ?? {};
  const headers = Object.keys(firstRow).map(normalizeHeader);
  const missing = TEMPLATE_HEADERS.filter((header) =>
    HEADER_ALIASES[header].every((alias) => !headers.includes(alias)),
  );

  if (missing.length > 0) {
    throw new Error(`Kolom tidak ditemukan: ${missing.join(", ")}`);
  }

  const seenSkus = new Set<string>();

  return rawRows
    .map((row, index) => {
      const rowNumber = index + 2;
      const name = toText(readCell(row, HEADER_ALIASES["Nama Produk"]));
      const sku = toText(readCell(row, HEADER_ALIASES.SKU)).toUpperCase();
      const categoryName = toText(readCell(row, HEADER_ALIASES.Kategori));
      const category = database.categories.find(
        (item) =>
          item.name.trim().toLowerCase() === categoryName.toLowerCase(),
      );
      const costPrice = parseNumber(
        readCell(row, HEADER_ALIASES["Harga Modal"]),
      );
      const price = parseNumber(readCell(row, HEADER_ALIASES["Harga Jual"]));
      const stock = parseNumber(readCell(row, HEADER_ALIASES["Stok Awal"]));
      const minStock = parseNumber(
        readCell(row, HEADER_ALIASES["Stok Minimum"]),
      );
      const errors: string[] = [];

      if (!name) errors.push("Nama produk wajib diisi");
      if (!sku) {
        errors.push("SKU wajib diisi");
      } else {
        if (seenSkus.has(sku)) errors.push("SKU duplikat di dalam file");
        if (!validateSku(database, sku)) errors.push("SKU sudah dipakai");
        seenSkus.add(sku);
      }
      if (!categoryName) {
        errors.push("Kategori wajib diisi");
      } else if (!category) {
        errors.push(`Kategori "${categoryName}" tidak dikenal`);
      }
      if (!Number.isFinite(costPrice) || costPrice < 0) {
        errors.push("Harga modal tidak valid");
      }
      if (!Number.isFinite(price) || price <= 0) {
        errors.push("Harga jual harus lebih dari 0");
      }
      if (!Number.isFinite(stock) || stock < 0) {
        errors.push("Stok awal tidak valid");
      }
      if (!Number.isFinite(minStock) || minStock < 0) {
        errors.push("Stok minimum tidak valid");
      }

      return {
        rowNumber,
        name,
        sku,
        categoryId: category?.id ?? "",
        categoryName: category?.name ?? categoryName,
        costPrice: Number.isFinite(costPrice) ? costPrice : 0,
        price: Number.isFinite(price) ? price : 0,
        stock: Number.isFinite(stock) ? stock : 0,
        minStock: Number.isFinite(minStock) ? minStock : 0,
        errors,
      };
    })
    .filter((row) => !isRowEmpty({ name: row.name, sku: row.sku }));
}

export function toImportPayload(row: ImportProductRow): ImportProductPayload {
  return {
    name: row.name,
    sku: row.sku,
    categoryId: row.categoryId,
    costPrice: row.costPrice,
    price: row.price,
    stock: row.stock,
    minStock: row.minStock,
  };
}
