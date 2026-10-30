import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
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
        user={data.user}
        actions={
          <>
            <Button variant="outline" size="md">
              Import Excel
            </Button>
            <Button variant="primary" size="md" className="px-4">
              + Tambah Produk
            </Button>
          </>
        }
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
