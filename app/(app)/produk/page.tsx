import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductPageActions } from "@/features/produk/components/ProductPageActions";
import { ProductStockStats } from "@/features/produk/components/ProductStockStats";
import { ProductTable } from "@/features/produk/components/ProductTable";
import { ProductTabs } from "@/features/produk/components/ProductTabs";
import { getProductsData } from "@/features/produk/data/produk-data";

export const metadata: Metadata = {
  title: "Produk & Stok",
};

export default function ProdukPage() {
  const data = getProductsData();

  return (
    <>
      <PageHeader
        title={data.header.title}
        subtitle={data.header.subtitle}
        actions={<ProductPageActions />}
      />

      <div className="flex flex-col gap-[18px] p-4 sm:p-5 lg:px-7 lg:py-5">
        <ProductTabs />
        <ProductStockStats stats={data.stats} />
        <ProductTable
          products={data.products}
          categories={data.categories}
          pagination={data.pagination}
        />
      </div>
    </>
  );
}
