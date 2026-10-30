"use client";

import { Tabs } from "@/components/ui/Tabs";

export type ProductTab =
  | "products"
  | "categories"
  | "stock-in"
  | "opname"
  | "transfer";

interface ProductTabsProps {
  value: ProductTab;
  onChange: (tab: ProductTab) => void;
  counts: {
    products: number;
    categories: number;
    stockIn: number;
    opname: number;
    transfer: number;
  };
}

export function ProductTabs({ value, onChange, counts }: ProductTabsProps) {
  return (
    <Tabs
      ariaLabel="Bagian produk dan stok"
      value={value}
      onChange={onChange}
      tabs={[
        { id: "products", label: "Daftar Produk", badge: counts.products },
        { id: "categories", label: "Kategori", badge: counts.categories },
        { id: "stock-in", label: "Stok Masuk", badge: counts.stockIn },
        { id: "opname", label: "Stok Opname", badge: counts.opname },
        {
          id: "transfer",
          label: "Transfer Antar Cabang",
          badge: counts.transfer,
        },
      ]}
    />
  );
}
