import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import { formatNumber, formatRupiah } from "@/lib/format";
import type {
  Product,
  ProductPagination,
  StockStatus,
} from "@/features/produk/types";

const STATUS_TONES: Record<StockStatus, BadgeTone> = {
  Aman: "success",
  Menipis: "brand",
  Habis: "danger",
};

const columns: readonly DataTableColumn<Product>[] = [
  {
    id: "product",
    header: "Produk",
    cell: (product) => (
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 shrink-0 rounded-control bg-line" />
        <div>
          <div className="font-semibold text-ink">{product.name}</div>
          <div className="text-meta text-ink-muted">{product.sku}</div>
        </div>
      </div>
    ),
  },
  {
    id: "category",
    header: "Kategori",
    cellClassName: "text-ink-soft",
    cell: (product) => product.category,
  },
  {
    id: "costPrice",
    header: "Harga Modal",
    align: "right",
    cellClassName: "text-ink-soft",
    cell: (product) => formatRupiah(product.costPrice),
  },
  {
    id: "price",
    header: "Harga Jual",
    align: "right",
    cellClassName: "font-semibold text-ink",
    cell: (product) => formatRupiah(product.price),
  },
  {
    id: "stock",
    header: "Stok",
    align: "right",
    cellClassName: "font-bold text-ink",
    cell: (product) => formatNumber(product.stock),
  },
  {
    id: "status",
    header: "Status",
    cell: (product) => (
      <StatusBadge tone={STATUS_TONES[product.status]}>
        {product.status}
      </StatusBadge>
    ),
  },
  {
    id: "action",
    header: <span className="sr-only">Aksi</span>,
    align: "right",
    cell: () => (
      <Button variant="outline" size="sm" className="h-[34px] px-3">
        Edit
      </Button>
    ),
  },
];

interface ProductTableProps {
  products: readonly Product[];
  categories: readonly string[];
  pagination: ProductPagination;
}

export function ProductTable({
  products,
  categories,
  pagination,
}: ProductTableProps) {
  return (
    <Card
      role="region"
      aria-label="Daftar produk"
      className="flex flex-col gap-3.5 p-[18px]"
    >
      <div className="flex flex-wrap gap-2.5">
        <SearchField
          label="Cari produk"
          placeholder="Cari nama atau SKU"
          className="flex-[1_1_240px]"
        />
        <Select aria-label="Filter kategori" className="w-auto">
          <option>Semua kategori</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </Select>
        <Select aria-label="Filter cabang" className="w-auto">
          <option>Toko Utama</option>
          <option>Semua cabang</option>
        </Select>
        <Select aria-label="Filter status stok" className="w-auto">
          <option>Semua status</option>
          <option>Menipis</option>
          <option>Habis</option>
        </Select>
      </div>

      <DataTable
        ariaLabel="Daftar produk dan stok"
        columns={columns}
        rows={products}
        rowKey={(product) => product.id}
        minWidth={760}
        density="roomy"
        headerTone="soft"
      />

      <div className="flex flex-wrap items-center justify-between gap-2.5 text-label text-ink-muted">
        <span>
          Menampilkan {formatNumber(pagination.from)} sampai{" "}
          {formatNumber(pagination.to)} dari {formatNumber(pagination.total)}{" "}
          produk
        </span>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="px-3 font-normal"
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-3 font-normal"
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </Card>
  );
}
