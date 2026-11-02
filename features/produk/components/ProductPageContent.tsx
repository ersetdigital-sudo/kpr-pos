"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { CategoryPanel } from "@/features/produk/components/CategoryPanel";
import { ImportProductsModal } from "@/features/produk/components/ImportProductsModal";
import { OpnamePanel } from "@/features/produk/components/OpnamePanel";
import { ProductFormDrawer } from "@/features/produk/components/ProductFormDrawer";
import { ProductPageActions } from "@/features/produk/components/ProductPageActions";
import { ProductStockStats } from "@/features/produk/components/ProductStockStats";
import { ProductTable } from "@/features/produk/components/ProductTable";
import {
  ProductTabs,
  type ProductTab,
} from "@/features/produk/components/ProductTabs";
import { StockInPanel } from "@/features/produk/components/StockInPanel";
import { TransferPanel } from "@/features/produk/components/TransferPanel";
import {
  buildCategoryUsage,
  buildProductRows,
  calculateProductStats,
  hasSalesHistory,
} from "@/features/produk/data/produk-calculations";
import {
  deleteProduct,
  setProductActive,
  useProdukData,
} from "@/features/produk/data/produk-repository";
import {
  usePermissions,
  useSession,
} from "@/features/session/data/session-repository";
import { toDateInputValue } from "@/lib/date-range";
import type { AppDatabase, Branch } from "@/lib/store/types";
import type {
  ProductFilters,
  ProductRow,
  StockProductOption,
} from "@/features/produk/types";

const PAGE_SIZE = 8;

export function ProductPageContent() {
  const database = useProdukData();
  const { branch, branches } = useSession();
  const permissions = usePermissions();
  const { showToast } = useToast();

  const [tab, setTab] = useState<ProductTab>("products");
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    categoryId: "all",
    branchId: branch.id,
    status: "all",
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const branchScope = permissions.canViewAllBranches
    ? filters.branchId
    : branch.id;

  function updateFilters(patch: Partial<ProductFilters>) {
    setFilters((current) => ({
      ...current,
      ...patch,
      branchId: permissions.canViewAllBranches
        ? (patch.branchId ?? current.branchId)
        : branch.id,
    }));
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(product: ProductRow) {
    setEditing(product);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      const result = await deleteProduct(deleteTarget.id);
      showToast(
        result.mode === "deleted"
          ? `Produk ${result.name} dihapus`
          : `Produk ${result.name} dinonaktifkan karena sudah pernah terjual`,
        "success",
      );
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Produk gagal dihapus",
        "error",
      );
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleReactivate(product: ProductRow) {
    try {
      await setProductActive(product.id, true);
      showToast(`Produk ${product.name} diaktifkan`, "success");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Produk gagal diaktifkan",
        "error",
      );
    }
  }

  if (!database) {
    return (
      <>
        <PageHeader
          title="Produk & Stok"
          subtitle="Memuat data produk…"
        />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-5">
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-body text-ink-muted">
            Menyiapkan data…
          </div>
        </div>
      </>
    );
  }

  return (
    <ProductPageBody
      database={database}
      branchId={branch.id}
      branchName={branch.name}
      branches={branches}
      branchScope={branchScope}
      tab={tab}
      onTabChange={setTab}
      filters={filters}
      onFiltersChange={updateFilters}
      onPageChange={(page) => updateFilters({ page })}
      canManageProducts={permissions.canManageProducts}
      canViewAllBranches={permissions.canViewAllBranches}
      onCreate={openCreate}
      onEdit={openEdit}
      onDelete={setDeleteTarget}
      onReactivate={handleReactivate}
      onImport={() => setImportOpen(true)}
      formOpen={formOpen}
      editing={editing}
      onCloseForm={() => setFormOpen(false)}
      importOpen={importOpen}
      onCloseImport={() => setImportOpen(false)}
      deleteOpen={deleteTarget !== null}
      onCancelDelete={() => setDeleteTarget(null)}
      onConfirmDelete={handleDelete}
      deleteDescription={
        deleteTarget
          ? hasSalesHistory(database, deleteTarget.id)
            ? `Produk "${deleteTarget.name}" sudah pernah terjual, jadi akan dinonaktifkan (tidak dihapus permanen).`
            : `Produk "${deleteTarget.name}" belum pernah terjual dan akan dihapus permanen.`
          : ""
      }
    />
  );
}

interface ProductPageBodyProps {
  database: AppDatabase;
  branchId: string;
  branchName: string;
  branches: Branch[];
  branchScope: string;
  tab: ProductTab;
  onTabChange: (tab: ProductTab) => void;
  filters: ProductFilters;
  onFiltersChange: (patch: Partial<ProductFilters>) => void;
  onPageChange: (page: number) => void;
  canManageProducts: boolean;
  canViewAllBranches: boolean;
  onCreate: () => void;
  onEdit: (product: ProductRow) => void;
  onDelete: (product: ProductRow) => void;
  onReactivate: (product: ProductRow) => void;
  onImport: () => void;
  formOpen: boolean;
  editing: ProductRow | null;
  onCloseForm: () => void;
  importOpen: boolean;
  onCloseImport: () => void;
  deleteOpen: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  deleteDescription: string;
}

function ProductPageBody({
  database,
  branchId,
  branchName,
  branches,
  branchScope,
  tab,
  onTabChange,
  filters,
  onFiltersChange,
  onPageChange,
  canManageProducts,
  canViewAllBranches,
  onCreate,
  onEdit,
  onDelete,
  onReactivate,
  onImport,
  formOpen,
  editing,
  onCloseForm,
  importOpen,
  onCloseImport,
  deleteOpen,
  onCancelDelete,
  onConfirmDelete,
  deleteDescription,
}: ProductPageBodyProps) {
  const todayInput = toDateInputValue(new Date());
  const today = useMemo(
    () => new Date(`${todayInput}T12:00:00`),
    [todayInput],
  );

  const { rows, pagination } = useMemo(
    () => buildProductRows(database, filters),
    [database, filters],
  );

  const stats = useMemo(
    () => calculateProductStats(database, branchScope, today),
    [database, branchScope, today],
  );

  const categoryUsages = useMemo(
    () => buildCategoryUsage(database),
    [database],
  );

  const stockOptions: StockProductOption[] = useMemo(() => {
    const stockByProduct = new Map(
      database.stocks
        .filter((level) => level.branchId === branchId)
        .map((level) => [level.productId, level.quantity]),
    );

    return database.products
      .filter((product) => product.isActive)
      .map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        stock: stockByProduct.get(product.id) ?? 0,
      }));
  }, [database, branchId]);

  const stockIns = database.stockIns.filter(
    (record) => record.branchId === branchId,
  );
  const stockOpnames = database.stockOpnames.filter(
    (record) => record.branchId === branchId,
  );
  const stockTransfers = database.stockTransfers.filter(
    (record) =>
      record.fromBranchId === branchId || record.toBranchId === branchId,
  );

  const subtitle = `${stats.totalProducts} produk · ${database.categories.length} kategori · ${
    branchScope === "all"
      ? "Semua cabang"
      : branches.find((branch) => branch.id === branchScope)?.name ?? branchName
  }`;

  return (
    <>
      <PageHeader
        title="Produk & Stok"
        subtitle={subtitle}
        actions={
          <ProductPageActions
            canManage={canManageProducts}
            onImport={onImport}
            onCreate={onCreate}
          />
        }
      />

      <div className="flex flex-col gap-[18px] p-4 sm:p-5 lg:px-7 lg:py-5">
        <ProductTabs
          value={tab}
          onChange={onTabChange}
          counts={{
            products: stats.totalProducts,
            categories: database.categories.length,
            stockIn: stockIns.length,
            opname: stockOpnames.length,
            transfer: stockTransfers.length,
          }}
        />

        {tab === "products" ? (
          <>
            <ProductStockStats stats={stats} />
            <ProductTable
              rows={rows}
              categories={database.categories}
              branches={branches}
              filters={filters}
              pagination={pagination}
              canManage={canManageProducts}
              canViewAllBranches={canViewAllBranches}
              onFiltersChange={onFiltersChange}
              onPageChange={onPageChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onReactivate={onReactivate}
            />
          </>
        ) : null}

        {tab === "categories" ? (
          <CategoryPanel
            usages={categoryUsages}
            canManage={canManageProducts}
          />
        ) : null}

        {tab === "stock-in" ? (
          <StockInPanel
            records={stockIns}
            products={stockOptions}
            employees={database.employees}
            branchName={branchName}
            today={todayInput}
            canManage={canManageProducts}
          />
        ) : null}

        {tab === "opname" ? (
          <OpnamePanel
            records={stockOpnames}
            products={stockOptions}
            employees={database.employees}
            branchName={branchName}
            today={todayInput}
            canManage={canManageProducts}
          />
        ) : null}

        {tab === "transfer" ? (
          <TransferPanel
            records={stockTransfers}
            products={stockOptions}
            branches={branches}
            employees={database.employees}
            branchId={branchId}
            branchName={branchName}
            today={todayInput}
            canManage={canManageProducts}
          />
        ) : null}
      </div>

      <ProductFormDrawer
        key={editing?.id ?? "new"}
        open={formOpen}
        product={editing}
        categories={database.categories}
        onClose={onCloseForm}
      />

      <ImportProductsModal
        open={importOpen}
        database={database}
        branchName={branchName}
        onClose={onCloseImport}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus produk?"
        description={deleteDescription}
        confirmLabel="Ya, hapus"
        onClose={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
