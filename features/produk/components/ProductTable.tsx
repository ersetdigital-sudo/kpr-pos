"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import type { Branch, Category } from "@/lib/store/types";
import { formatNumber, formatRupiah } from "@/lib/format";
import type {
  ProductFilters,
  ProductPagination,
  ProductRow,
  StockStatus,
} from "@/features/produk/types";

const STATUS_TONES: Record<StockStatus, BadgeTone> = {
  Aman: "success",
  Menipis: "brand",
  Habis: "danger",
  Nonaktif: "neutral",
};

interface ProductTableProps {
  rows: readonly ProductRow[];
  categories: readonly Category[];
  branches: readonly Branch[];
  filters: ProductFilters;
  pagination: ProductPagination;
  canManage: boolean;
  canViewAllBranches: boolean;
  onFiltersChange: (patch: Partial<ProductFilters>) => void;
  onPageChange: (page: number) => void;
  onEdit: (product: ProductRow) => void;
  onDelete: (product: ProductRow) => void;
  onReactivate: (product: ProductRow) => void;
}

export function ProductTable({
  rows,
  categories,
  branches,
  filters,
  pagination,
  canManage,
  canViewAllBranches,
  onFiltersChange,
  onPageChange,
  onEdit,
  onDelete,
  onReactivate,
}: ProductTableProps) {
  const columns = useMemo(() => {
    const base: DataTableColumn<ProductRow>[] = [
      {
        id: "product",
        header: "Produk",
        cell: (product) => (
          <div className="flex items-center gap-2.5">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10 shrink-0 rounded-control object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-line text-meta font-bold text-ink-muted">
                {product.name.slice(0, 2).toUpperCase()}
              </div>
            )}
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
        cell: (product) => product.categoryName,
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
        cell: (product) => (
          <span>
            {formatNumber(product.stock)}
            <span className="ml-1 text-meta font-normal text-ink-muted">
              / min {formatNumber(product.minStock)}
            </span>
          </span>
        ),
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
    ];

    if (!canManage) return base;

    const actionColumn: DataTableColumn<ProductRow> = {
      id: "action",
      header: <span className="sr-only">Aksi</span>,
      align: "right",
      cell: (product) => (
          <div className="flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-[32px] px-2.5 text-meta"
              onClick={() => onEdit(product)}
            >
              Edit
            </Button>
            {product.isActive ? (
              <Button
                variant="dangerOutline"
                size="sm"
                className="h-[32px] px-2.5 text-meta"
                onClick={() => onDelete(product)}
              >
                Hapus
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-[32px] px-2.5 text-meta"
                onClick={() => onReactivate(product)}
              >
                Aktifkan
              </Button>
            )}
          </div>
        ),
    };

    return [...base, actionColumn];
  }, [canManage, onDelete, onEdit, onReactivate]);

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
          value={filters.search}
          onChange={(event) =>
            onFiltersChange({ search: event.target.value, page: 1 })
          }
        />
        <Select
          aria-label="Filter kategori"
          className="w-auto"
          value={filters.categoryId}
          onChange={(event) =>
            onFiltersChange({ categoryId: event.target.value, page: 1 })
          }
        >
          <option value="all">Semua kategori</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        {canViewAllBranches ? (
          <Select
            aria-label="Filter cabang"
            className="w-auto"
            value={filters.branchId}
            onChange={(event) =>
              onFiltersChange({ branchId: event.target.value, page: 1 })
            }
          >
            <option value="all">Semua cabang</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Select
          aria-label="Filter status stok"
          className="w-auto"
          value={filters.status}
          onChange={(event) =>
            onFiltersChange({
              status: event.target.value as ProductFilters["status"],
              page: 1,
            })
          }
        >
          <option value="all">Semua status</option>
          <option value="Aman">Aman</option>
          <option value="Menipis">Menipis</option>
          <option value="Habis">Habis</option>
          <option value="Nonaktif">Nonaktif</option>
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            Produk tidak ditemukan
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            Ubah kata kunci atau filter yang dipakai.
          </p>
        </div>
      ) : (
        <DataTable
          ariaLabel="Daftar produk dan stok"
          columns={columns}
          rows={rows}
          rowKey={(product) => product.id}
          minWidth={820}
          density="roomy"
          headerTone="soft"
          rowClassName={(product) =>
            product.isActive ? undefined : "opacity-60"
          }
        />
      )}

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={onPageChange}
        itemLabel="produk"
      />
    </Card>
  );
}
