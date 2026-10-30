import type { SessionUser } from "@/types";

export interface KasirProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

export interface CartLine {
  product: KasirProduct;
  quantity: number;
}

export interface CartSummary {
  lines: readonly CartLine[];
  subtotal: number;
  discount: number;
  total: number;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface CashierData {
  header: {
    title: string;
    subtitle: string;
  };
  user: SessionUser;
  invoiceNumber: string;
  salespeople: readonly string[];
  categories: readonly string[];
  products: readonly KasirProduct[];
  cart: CartSummary;
  bankAccounts: readonly BankAccount[];
  cashReceivedDefault: number;
}
