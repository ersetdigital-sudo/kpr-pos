"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { LeaderboardTable } from "@/features/pesanan/components/LeaderboardTable";
import { NewOrderForm } from "@/features/pesanan/components/NewOrderForm";
import { OrderDetailModal } from "@/features/pesanan/components/OrderDetailModal";
import { OrderTable } from "@/features/pesanan/components/OrderTable";
import { SalesStatsCards } from "@/features/pesanan/components/SalesStatsCards";
import {
  buildLeaderboard,
  buildOrderRows,
  buildProductOptions,
  buildSalesOptions,
  calculateSalesStats,
  collectBonusEntries,
  countAwaitingPayment,
  describeBonusRule,
  getVisibleOrders,
} from "@/features/pesanan/data/pesanan-calculations";
import {
  deleteSalesOrder,
  updateSalesOrderStatus,
  usePesananData,
} from "@/features/pesanan/data/pesanan-repository";
import {
  usePermissions,
  useSession,
} from "@/features/session/data/session-repository";
import { ROLES } from "@/constants/roles";
import { getMonthRange } from "@/lib/date-range";
import { formatMonthYear } from "@/lib/format";
import type {
  AppDatabase,
  Employee,
  SalesOrder,
  SalesOrderStatus,
} from "@/lib/store/types";
import type { OrderRow } from "@/features/pesanan/types";

export function PesananPageContent() {
  const database = usePesananData();
  const { employee } = useSession();
  const permissions = usePermissions();
  const { showToast } = useToast();
  const router = useRouter();
  const [pendingCancel, setPendingCancel] = useState<OrderRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OrderRow | null>(null);
  const [detailOrder, setDetailOrder] = useState<SalesOrder | null>(null);

  async function applyStatus(row: OrderRow, status: SalesOrderStatus) {
    try {
      await updateSalesOrderStatus(row.id, status);
      showToast(
        status === "Lunas"
          ? `Pesanan ${row.orderNumber} lunas, stok cabang berkurang`
          : status === "Dibatalkan" && row.transactionId
            ? `Pesanan ${row.orderNumber} dibatalkan, transaksi kasir ikut direfund`
            : `Status ${row.orderNumber} menjadi ${status}`,
        "success",
      );
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Status gagal diubah",
        "error",
      );
    }
  }

  function handleStatusChange(row: OrderRow, status: SalesOrderStatus) {
    if (status === "Dibatalkan") {
      setPendingCancel(row);
      return;
    }
    applyStatus(row, status);
  }

  async function handleDelete() {
    if (!pendingDelete) return;

    try {
      await deleteSalesOrder(pendingDelete.id);
      showToast(`Pesanan ${pendingDelete.orderNumber} dihapus`, "success");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Pesanan gagal dihapus",
        "error",
      );
    } finally {
      setPendingDelete(null);
    }
  }

  if (!database) {
    return (
      <>
        <PageHeader title="Pesanan Sales" subtitle="Memuat data pesanan…" />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-body text-ink-muted">
            Menyiapkan data…
          </div>
        </div>
      </>
    );
  }

  const salesOrders = database.salesOrders;

  function handleViewDetail(row: OrderRow) {
    const order = salesOrders.find((item) => item.id === row.id);

    if (!order) {
      showToast("Pesanan tidak ditemukan", "error");
      return;
    }

    setDetailOrder(order);
  }

  return (
    <>
      <PesananBody
        database={database}
        employee={employee}
        canCreate={permissions.canCreateSalesOrder}
        canManage={permissions.canManageSalesOrders}
        canDelete={permissions.canDeleteSalesOrder}
        onStatusChange={handleStatusChange}
        onDelete={setPendingDelete}
        onViewDetail={handleViewDetail}
      />

      <ConfirmDialog
        open={pendingCancel !== null}
        title="Batalkan pesanan?"
        description={
          pendingCancel
            ? `Pesanan ${pendingCancel.orderNumber} untuk ${pendingCancel.customerName} akan dibatalkan. Stok yang sudah terpotong dikembalikan.${
                pendingCancel.transactionId
                  ? " Transaksi kasir terkait ikut direfund dengan alasannya."
                  : ""
              }`
            : ""
        }
        confirmLabel="Ya, batalkan"
        onClose={() => setPendingCancel(null)}
        onConfirm={() => {
          if (pendingCancel) applyStatus(pendingCancel, "Dibatalkan");
          setPendingCancel(null);
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus pesanan?"
        description={
          pendingDelete
            ? `Pesanan ${pendingDelete.orderNumber} untuk ${pendingDelete.customerName} akan dihapus permanen dari daftar pesanan.`
            : ""
        }
        confirmLabel="Ya, hapus"
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />

      <OrderDetailModal
        order={detailOrder}
        salesName={
          detailOrder
            ? (database.employees.find(
                (item) => item.id === detailOrder.salesEmployeeId,
              )?.name ?? "Sales")
            : "Sales"
        }
        branchName={
          detailOrder
            ? (database.branches.find(
                (item) => item.id === detailOrder.branchId,
              )?.name ?? "-")
            : "-"
        }
        canProcess={permissions.canUseCashier}
        onProcess={() => {
          if (!detailOrder) return;
          router.push(`/kasir?order=${detailOrder.id}`);
        }}
        onClose={() => setDetailOrder(null)}
      />
    </>
  );
}

interface PesananBodyProps {
  database: AppDatabase;
  employee: Employee;
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
  onStatusChange: (row: OrderRow, status: SalesOrderStatus) => void;
  onDelete: (row: OrderRow) => void;
  onViewDetail: (row: OrderRow) => void;
}

function PesananBody({
  database,
  employee,
  canCreate,
  canManage,
  canDelete,
  onStatusChange,
  onDelete,
  onViewDetail,
}: PesananBodyProps) {
  const today = new Date();
  const monthRange = getMonthRange(today);
  const isSales = employee.role === ROLES.SALES;
  const periodLabel = formatMonthYear(today);

  const bonusEntries = collectBonusEntries(database, monthRange);
  const leaderboard = buildLeaderboard(bonusEntries, employee.id);
  const visibleOrders = getVisibleOrders(database, employee);
  const orderRows = buildOrderRows(database, employee);
  const awaitingPayment = countAwaitingPayment(visibleOrders);

  const baseStats = calculateSalesStats(
    bonusEntries,
    leaderboard,
    employee.id,
    awaitingPayment,
    database.settings.salesBonus,
  );
  const stats = isSales
    ? baseStats
    : {
        ...baseStats,
        soldThisMonth: bonusEntries.reduce(
          (total, entry) => total + entry.quantity,
          0,
        ),
        runningBonus: bonusEntries.reduce(
          (total, entry) => total + entry.bonus,
          0,
        ),
        rank: 0,
      };

  const productOptions = buildProductOptions(database, employee.branchId);
  const branchSales = buildSalesOptions(database).filter(
    (sales) => sales.branchId === employee.branchId,
  );
  const salesOptions = branchSales.length > 0 ? branchSales : buildSalesOptions(database);
  const defaultSalesId = isSales ? employee.id : (salesOptions[0]?.id ?? "");

  return (
    <>
      <PageHeader
        title="Pesanan Sales"
        subtitle={
          isSales
            ? "Catat order yang kamu dapat, bonus dihitung otomatis"
            : "Semua pesanan sales beserta bonus yang berjalan"
        }
        actions={
          <Chip tone={awaitingPayment > 0 ? "warning" : "success"} dot>
            {awaitingPayment > 0
              ? `${awaitingPayment} pesanan menunggu bayar`
              : "Semua pesanan lunas"}
          </Chip>
        }
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        <SalesStatsCards stats={stats} />

        <div className="flex flex-wrap items-stretch gap-4">
          {canCreate ? (
            <NewOrderForm
              branchId={employee.branchId}
              branchName={
                database.branches.find(
                  (branch) => branch.id === employee.branchId,
                )?.name ?? "Cabang"
              }
              productOptions={productOptions}
              salesOptions={salesOptions}
              defaultSalesId={defaultSalesId}
              canChooseSales={!isSales}
            />
          ) : null}

          <LeaderboardTable
            entries={leaderboard}
            periodLabel={periodLabel}
            bonusRuleLabel={describeBonusRule(database.settings.salesBonus)}
          />
        </div>

        <OrderTable
          rows={orderRows}
          canManage={canManage}
          canDelete={canDelete}
          showSales={!isSales}
          title={isSales ? "Pesanan Saya" : "Semua Pesanan Sales"}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onViewDetail={onViewDetail}
        />
      </div>
    </>
  );
}
