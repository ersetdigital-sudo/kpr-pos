import { ROLES } from "@/constants/roles";
import type { CashierData } from "@/features/kasir/types";

const products: CashierData["products"] = [
  {
    id: "produk-a",
    name: "[Produk A]",
    price: 35_000,
    stock: 24,
    category: "[Kategori 1]",
  },
  {
    id: "produk-b",
    name: "[Produk B]",
    price: 48_000,
    stock: 3,
    category: "[Kategori 1]",
  },
  {
    id: "produk-c",
    name: "[Produk C]",
    price: 25_000,
    stock: 40,
    category: "[Kategori 2]",
  },
  {
    id: "produk-d",
    name: "[Produk D]",
    price: 62_000,
    stock: 12,
    category: "[Kategori 2]",
  },
  {
    id: "produk-e",
    name: "[Produk E]",
    price: 18_000,
    stock: 58,
    category: "[Kategori 3]",
  },
  {
    id: "produk-f",
    name: "[Produk F]",
    price: 55_000,
    stock: 5,
    category: "[Kategori 3]",
  },
  {
    id: "produk-g",
    name: "[Produk G]",
    price: 29_000,
    stock: 19,
    category: "[Kategori 4]",
  },
  {
    id: "produk-h",
    name: "[Produk H]",
    price: 42_000,
    stock: 31,
    category: "[Kategori 4]",
  },
];

function findProduct(id: string) {
  const product = products.find((item) => item.id === id);

  if (!product) {
    throw new Error(`Produk ${id} tidak ditemukan pada data dummy kasir`);
  }

  return product;
}

const cart: CashierData["cart"] = {
  lines: [
    { product: findProduct("produk-a"), quantity: 2 },
    { product: findProduct("produk-d"), quantity: 1 },
    { product: findProduct("produk-f"), quantity: 1 },
    { product: findProduct("produk-g"), quantity: 2 },
  ],
  subtotal: 245_000,
  discount: 10_000,
  total: 235_000,
};

const bankAccounts: CashierData["bankAccounts"] = [
  {
    id: "bca",
    bankName: "Bank BCA",
    accountNumber: "1234567890",
    accountHolder: "CV. Karya Putra Ragil",
  },
  {
    id: "bri",
    bankName: "Bank BRI",
    accountNumber: "0021-01-000123-30-1",
    accountHolder: "CV. Karya Putra Ragil",
  },
  {
    id: "mandiri",
    bankName: "Bank Mandiri",
    accountNumber: "1370-00-1234567-8",
    accountHolder: "CV. Karya Putra Ragil",
  },
];

/** Sumber data kasir; ganti isi fungsi ini saat memakai API/database. */
export function getCashierData(): CashierData {
  return {
    header: {
      title: "Kasir",
      subtitle: "Toko Utama · Shift pagi dibuka 08:00",
    },
    user: {
      name: "Lala",
      role: ROLES.CASHIER,
      initials: "LA",
    },
    invoiceNumber: "INV-2910-087",
    salespeople: ["Rina", "Dimas", "Tanpa sales"],
    categories: [
      "[Kategori 1]",
      "[Kategori 2]",
      "[Kategori 3]",
      "[Kategori 4]",
    ],
    products,
    cart,
    bankAccounts,
    cashReceivedDefault: 250_000,
  };
}
