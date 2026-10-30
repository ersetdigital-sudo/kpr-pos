import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { CategoryFilter } from "@/features/kasir/components/CategoryFilter";
import { ProductCard } from "@/features/kasir/components/ProductCard";
import type { KasirProduct } from "@/features/kasir/types";

interface ProductCatalogProps {
  products: readonly KasirProduct[];
  categories: readonly string[];
}

export function ProductCatalog({
  products,
  categories,
}: ProductCatalogProps) {
  return (
    <section
      aria-label="Daftar produk"
      className="flex min-w-0 flex-[3_1_480px] flex-col gap-4"
    >
      <div className="flex flex-wrap gap-2.5">
        <SearchField
          label="Cari produk"
          placeholder="Cari nama produk atau scan barcode"
          size="md"
          className="flex-[1_1_260px]"
        />
        <Button
          variant="outline"
          size="xl"
          className="rounded-control-lg px-4"
        >
          Scan Barcode
        </Button>
      </div>

      <CategoryFilter categories={categories} />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
