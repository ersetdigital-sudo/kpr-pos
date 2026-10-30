import type { ProductsData } from "@/features/produk/types";

const products: ProductsData["products"] = [
  {
    id: "produk-a",
    name: "[Produk A]",
    sku: "SKU-0001",
    category: "[Kategori 1]",
    costPrice: 24_000,
    price: 35_000,
    stock: 24,
    status: "Aman",
  },
  {
    id: "produk-b",
    name: "[Produk B]",
    sku: "SKU-0002",
    category: "[Kategori 1]",
    costPrice: 33_000,
    price: 48_000,
    stock: 3,
    status: "Menipis",
  },
  {
    id: "produk-c",
    name: "[Produk C]",
    sku: "SKU-0003",
    category: "[Kategori 2]",
    costPrice: 16_000,
    price: 25_000,
    stock: 0,
    status: "Habis",
  },
  {
    id: "produk-d",
    name: "[Produk D]",
    sku: "SKU-0004",
    category: "[Kategori 2]",
    costPrice: 45_000,
    price: 62_000,
    stock: 12,
    status: "Aman",
  },
  {
    id: "produk-e",
    name: "[Produk E]",
    sku: "SKU-0005",
    category: "[Kategori 3]",
    costPrice: 11_000,
    price: 18_000,
    stock: 58,
    status: "Aman",
  },
  {
    id: "produk-f",
    name: "[Produk F]",
    sku: "SKU-0006",
    category: "[Kategori 3]",
    costPrice: 39_000,
    price: 55_000,
    stock: 5,
    status: "Menipis",
  },
  {
    id: "produk-g",
    name: "[Produk G]",
    sku: "SKU-0007",
    category: "[Kategori 4]",
    costPrice: 20_000,
    price: 29_000,
    stock: 19,
    status: "Aman",
  },
  {
    id: "produk-h",
    name: "[Produk H]",
    sku: "SKU-0008",
    category: "[Kategori 4]",
    costPrice: 30_000,
    price: 42_000,
    stock: 31,
    status: "Aman",
  },
];

/** Sumber data produk & stok; ganti isi fungsi ini saat memakai API/database. */
export function getProductsData(): ProductsData {
  return {
    header: {
      title: "Produk & Stok",
      subtitle: "128 produk · 12 kategori",
    },
    stats: {
      totalStockValue: 86_400_000,
      lowStockCount: 7,
      outOfStockCount: 2,
      incomingThisWeek: 340,
    },
    categories: [
      "[Kategori 1]",
      "[Kategori 2]",
      "[Kategori 3]",
      "[Kategori 4]",
    ],
    products,
    pagination: {
      from: 1,
      to: products.length,
      total: 128,
    },
  };
}
