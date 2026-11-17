"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DateRangePicker,
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { CustomerDetailModal } from "@/features/pelanggan/components/CustomerDetailModal";
import { CustomerFormModal } from "@/features/pelanggan/components/CustomerFormModal";
import {
  CustomerList,
  type CustomerSort,
} from "@/features/pelanggan/components/CustomerList";
import { CustomerMergeDialog } from "@/features/pelanggan/components/CustomerMergeDialog";
import {
  buildCustomerRecapRows,
  buildCustomerSpending,
} from "@/features/pelanggan/data/pelanggan-calculations";
import { exportCustomerRecapExcel } from "@/features/pelanggan/data/pelanggan-excel";
import {
  deleteCustomerRecord,
  logCustomerRecapExport,
  mergeCustomers,
  saveCustomer,
  setCustomerActive,
  usePelangganData,
} from "@/features/pelanggan/data/pelanggan-repository";
import { usePermissions } from "@/features/session/data/session-repository";
import {
  formatDateRange,
  resolveDateRange,
  toDateInputValue,
} from "@/lib/date-range";
import { formatNumber } from "@/lib/format";
import type { AppDatabase } from "@/lib/store/types";
import type { CustomerRecapRow } from "@/features/pelanggan/types";

const INITIAL_RANGE: DateRangeValue = {
  preset: "month",
  start: "",
  end: "",
};

export function PelangganPageContent() {
  const database = usePelangganData();
  const permissions = usePermissions();
  const { showToast } = useToast();

  if (!database) {
    return (
      <>
        <PageHeader title="Pelanggan" subtitle="Memuat data pelanggan…" />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-body text-ink-muted">
            Menyiapkan data…
          </div>
        </div>
      </>
    );
  }

  return (
    <PelangganBody
      database={database}
      canManageTempo={permissions.canSetCustomerTempo}
      canManageData={permissions.canManageCustomerData}
      onNotify={showToast}
    />
  );
}

interface PelangganBodyProps {
  database: AppDatabase;
  canManageTempo: boolean;
  canManageData: boolean;
  onNotify: (message: string, tone?: "success" | "error" | "info") => void;
}

function PelangganBody({
  database,
  canManageTempo,
  canManageData,
  onNotify,
}: PelangganBodyProps) {
  const todayInput = toDateInputValue(new Date());
  const [range, setRange] = useState<DateRangeValue>(INITIAL_RANGE);
  const [sort, setSort] = useState<CustomerSort>("spending");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRecapRow | null>(null);
  const [detail, setDetail] = useState<CustomerRecapRow | null>(null);
  const [mergeSource, setMergeSource] = useState<CustomerRecapRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRecapRow | null>(
    null,
  );
  const [deactivateTarget, setDeactivateTarget] =
    useState<CustomerRecapRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [managing, setManaging] = useState(false);
  const [exporting, setExporting] = useState(false);

  const rangeDate = useMemo(
    () => resolveDateRange(range, new Date(`${todayInput}T12:00:00`)),
    [range, todayInput],
  );

  const rows = useMemo(
    () => buildCustomerRecapRows(database, rangeDate),
    [database, rangeDate],
  );

  const visibleRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = keyword
      ? rows.filter(
          (row) =>
            row.name.toLowerCase().includes(keyword) ||
            row.phone.toLowerCase().includes(keyword),
        )
      : rows;

    return [...filtered].sort((first, second) => {
      if (sort === "name") return first.name.localeCompare(second.name);

      return (
        second.totalSpending - first.totalSpending ||
        first.name.localeCompare(second.name)
      );
    });
  }, [rows, search, sort]);

  const periodLabel = formatDateRange(rangeDate);
  const detailData = useMemo(
    () =>
      detail ? buildCustomerSpending(database, detail, rangeDate) : null,
    [database, detail, rangeDate],
  );
  const mergeTargets = useMemo(
    () => rows.filter((row) => row.id !== mergeSource?.id),
    [rows, mergeSource],
  );

  async function handleSubmit(input: {
    id?: string;
    name: string;
    phone: string;
    address: string;
    npwp: string;
    allowTempo: boolean;
  }) {
    if (saving) return;
    setSaving(true);

    try {
      await saveCustomer(input);
      setFormOpen(false);
      setEditing(null);
      onNotify("Data pelanggan disimpan", "success");
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "Pelanggan gagal disimpan",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);

    try {
      await exportCustomerRecapExcel(visibleRows, { periodLabel });
      logCustomerRecapExport(periodLabel, visibleRows.length);
      onNotify("File Excel rekap pelanggan berhasil dibuat", "success");
    } catch {
      onNotify("Export rekap pelanggan gagal, coba lagi", "error");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || managing) return;
    setManaging(true);

    try {
      await deleteCustomerRecord(deleteTarget);
      onNotify(`Pelanggan ${deleteTarget.name} dihapus`, "success");
      setDeleteTarget(null);
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "Pelanggan gagal dihapus",
        "error",
      );
    } finally {
      setManaging(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget || managing) return;
    setManaging(true);

    try {
      await setCustomerActive(deactivateTarget, false);
      onNotify(
        `Pelanggan ${deactivateTarget.name} dinonaktifkan`,
        "success",
      );
      setDeactivateTarget(null);
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "Pelanggan gagal dinonaktifkan",
        "error",
      );
    } finally {
      setManaging(false);
    }
  }

  async function handleMerge(targetId: string) {
    if (!mergeSource || managing) return;
    const target = mergeTargets.find((row) => row.id === targetId);

    if (!target) {
      onNotify("Pelanggan target tidak ditemukan", "error");
      return;
    }

    setManaging(true);

    try {
      const result = await mergeCustomers(mergeSource, target);
      onNotify(
        `${formatNumber(result.movedOrders)} pesanan digabung ke ${result.targetName}`,
        "success",
      );
      setMergeSource(null);
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "Pelanggan gagal digabungkan",
        "error",
      );
    } finally {
      setManaging(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Pelanggan"
        subtitle={`Rekap belanja ${periodLabel} · ${formatNumber(rows.length)} pelanggan aktif`}
        actions={
          <>
            <DateRangePicker
              value={range}
              onChange={setRange}
              defaultDate={todayInput}
            />
            <Button
              variant="outline"
              size="md"
              onClick={handleExport}
              disabled={exporting}
            >
              <Icon name="download" size={16} />
              {exporting ? "Menyiapkan…" : "Ekspor Excel"}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        <CustomerList
          rows={visibleRows}
          totalCount={rows.length}
          search={search}
          sort={sort}
          canManageData={canManageData}
          onSearchChange={setSearch}
          onSortChange={setSort}
          onAdd={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          onEdit={(row) => {
            setEditing(row);
            setFormOpen(true);
          }}
          onOpenDetail={setDetail}
          onMerge={setMergeSource}
          onDeactivate={setDeactivateTarget}
          onDelete={setDeleteTarget}
        />
      </div>

      {formOpen ? (
        <CustomerFormModal
          key={editing?.id ?? "new"}
          customer={editing}
          canSetTempo={canManageTempo}
          saving={saving}
          onClose={() => {
            if (saving) return;
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {detail && detailData ? (
        <CustomerDetailModal
          customer={detail}
          summary={detailData.summary}
          history={detailData.history}
          periodLabel={periodLabel}
          onClose={() => setDetail(null)}
        />
      ) : null}

      {mergeSource ? (
        <CustomerMergeDialog
          source={mergeSource}
          targets={mergeTargets}
          saving={managing}
          onClose={() => {
            if (!managing) setMergeSource(null);
          }}
          onConfirm={handleMerge}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus pelanggan?"
        description={
          deleteTarget
            ? `Pelanggan "${deleteTarget.name}" belum punya pesanan/transaksi dan akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
            : ""
        }
        confirmLabel={managing ? "Menghapus…" : "Ya, hapus"}
        onClose={() => {
          if (!managing) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Nonaktifkan pelanggan?"
        description={
          deactivateTarget
            ? `Pelanggan "${deactivateTarget.name}" disembunyikan dari daftar. Riwayat dan piutang tetap tersimpan.${
                deactivateTarget.activeTempo
                  ? " Tempo aktif tetap berjalan sampai lunas atau dibatalkan."
                  : ""
              }`
            : ""
        }
        confirmLabel={managing ? "Menonaktifkan…" : "Ya, nonaktifkan"}
        tone="primary"
        onClose={() => {
          if (!managing) setDeactivateTarget(null);
        }}
        onConfirm={handleDeactivate}
      />
    </>
  );
}
