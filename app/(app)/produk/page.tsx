import type { Metadata } from "next";
import { ProductPageContent } from "@/features/produk/components/ProductPageContent";

export const metadata: Metadata = {
  title: "Produk & Stok",
};

export default function ProdukPage() {
  return <ProductPageContent />;
}
