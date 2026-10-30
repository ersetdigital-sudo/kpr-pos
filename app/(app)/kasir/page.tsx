import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { CartPanel } from "@/features/kasir/components/CartPanel";
import { ProductCatalog } from "@/features/kasir/components/ProductCatalog";
import { getCashierData } from "@/features/kasir/data/kasir-data";

export const metadata: Metadata = {
  title: "Kasir",
};

export default function KasirPage() {
  const data = getCashierData();

  return (
    <>
      <PageHeader
        title={data.header.title}
        subtitle={data.header.subtitle}
        user={data.user}
        actions={
          <>
            <Chip tone="success" dot>
              Online · Tersinkron
            </Chip>
            <Chip tone="neutral">Printer &amp; laci siap</Chip>
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-5 p-4 sm:p-5 lg:px-7 lg:py-5">
        <ProductCatalog
          products={data.products}
          categories={data.categories}
        />
        <CartPanel data={data} />
      </div>
    </>
  );
}
