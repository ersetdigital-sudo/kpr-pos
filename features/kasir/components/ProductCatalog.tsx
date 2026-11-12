"use client";

import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { CategoryFilter } from "@/features/kasir/components/CategoryFilter";
import { ProductCard } from "@/features/kasir/components/ProductCard";
import type {
  KasirCategory,
  KasirProduct,
} from "@/features/kasir/types";

interface ProductCatalogProps {
  products: readonly KasirProduct[];
  hasBranchProducts: boolean;
  categories: readonly KasirCategory[];
  search: string;
  activeCategoryId: string | null;
  onSearchChange: (value: string) => void;
  onCategoryChange: (categoryId: string | null) => void;
  onAddProduct: (product: KasirProduct) => void;
  onScan: () => void;
}

export function ProductCatalog({
  products,
  hasBranchProducts,
  categories,
  search,
  activeCategoryId,
  onSearchChange,
  onCategoryChange,
  onAddProduct,
  onScan,
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
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <Button
          variant="outline"
          size="xl"
          className="rounded-control-lg px-4"
          onClick={onScan}
        >
          Scan Barcode
        </Button>
      </div>

      <CategoryFilter
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelect={onCategoryChange}
      />

      {products.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong bg-surface px-5 py-10 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            {hasBranchProducts
              ? "Produk tidak ditemukan"
              : "Belum ada produk di cabang ini"}
          </p>
          <p className="mt-1 mb-0 text-label text-ink-muted">
            {hasBranchProducts
              ? "Coba kata kunci atau kategori lain."
              : "Produk bisa ditambahkan lewat Produk & Stok: tambah produk, stok masuk, atau transfer stok dari cabang lain."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={onAddProduct}
            />
          ))}
        </div>
      )}
    </section>
  );
}
