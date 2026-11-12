"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { CashBookCategoryModal } from "@/features/buku-kas/components/CashBookCategoryModal";
import { CashBookEntryDrawer } from "@/features/buku-kas/components/CashBookEntryDrawer";
import { CashBookFilters } from "@/features/buku-kas/components/CashBookFilters";
import { CashBookSummaryCards } from "@/features/buku-kas/components/CashBookSummaryCards";
import { CashBookTable } from "@/features/buku-kas/components/CashBookTable";
import { CashBookYearlyRecap } from "@/features/buku-kas/components/CashBookYearlyRecap";
import { buildCashBookView } from "@/features/buku-kas/data/calculations";
import {
  deleteCashBookEntry,
  useCashBookData,
} from "@/features/buku-kas/data/repository";
import {
  usePermissions,
  useSession,
} from "@/features/session/data/session-repository";
import { toDateInputValue } from "@/lib/date-range";
import { formatRupiah } from "@/lib/format";
import { useHydratedDatabase } from "@/lib/store/store";
import type {
  CashBookEntry,
  CashBookPeriod,
  CashBookQuery,
  CashBookRow,
  CashBookType,
} from "@/features/buku-kas/types";

interface EntryDrawerState {
  open: boolean;
  type: CashBookType;
  entry: CashBookEntry | null;
}

const CLOSED_DRAWER: EntryDrawerState = {
  open: false,
  type: "masuk",
  entry: null,
};

export function BukuKasPageContent() {
  const database = useHydratedDatabase();
  const { branch, branches, isOwner } = useSession();
  const permissions = usePermissions();
  const { showToast } = useToast();

  const [period, setPeriod] = useState<CashBookPeriod>("harian");
  const [dateInput, setDateInput] = useState("");
  const [monthInput, setMonthInput] = useState("");
  const [yearInput, setYearInput] = useState("");
  const [branchId, setBranchId] = useState<string>("all");
  const [drawer, setDrawer] = useState<EntryDrawerState>(CLOSED_DRAWER);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CashBookEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Tanggal baru dibaca setelah store ter-hydrate (aman untuk prerender).
  const today = database ? toDateInputValue(new Date()) : "";
  const activeDate = dateInput || today;
  const activeMonth = monthInput || today.slice(0, 7);
  const activeYear = yearInput || today.slice(0, 4);
  const scope = isOwner ? branchId : branch.id;

  const query = useMemo<CashBookQuery | null>(
    () =>
      database
        ? {
            period,
            date: activeDate,
            month: activeMonth,
            year: activeYear,
            scope,
          }
        : null,
    [database, period, activeDate, activeMonth, activeYear, scope],
  );

  const { source, sourceQuery, loading, reload } = useCashBookData(query);

  // View dihitung dari parameter snapshot sumbernya agar label dan angka
  // selalu berasal dari periode yang sama saat data baru sedang dimuat.
  const view = useMemo(
    () =>
      source && sourceQuery ? buildCashBookView(source, sourceQuery) : null,
    [source, sourceQuery],
  );

  if (!database) {
    return (
      <>
        <PageHeader title="Buku Kas" subtitle="Memuat data kas…" />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-body text-ink-muted">
            Menyiapkan data…
          </div>
        </div>
      </>
    );
  }

  const branchLabel =
    scope === "all"
      ? "Semua cabang"
      : (branches.find((item) => item.id === scope)?.name ?? branch.name);

  function openEntry(type: CashBookType, entry: CashBookEntry | null = null) {
    setDrawer({ open: true, type, entry });
  }

  function findEntry(row: CashBookRow): CashBookEntry | undefined {
    return source?.entries.find((entry) => entry.id === row.entryId);
  }

  function handleEditRow(row: CashBookRow) {
    const entry = findEntry(row);
    if (entry) openEntry(entry.type, entry);
  }

  function handleDeleteRow(row: CashBookRow) {
    const entry = findEntry(row);
    if (entry) setDeleteTarget(entry);
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);

    try {
      await deleteCashBookEntry(deleteTarget);
      showToast("Entri buku kas dihapus", "success");
      reload();
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Entri gagal dihapus",
        "error",
      );
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Buku Kas"
        subtitle={`${view?.periodLabel ?? "—"} · ${branchLabel}`}
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => openEntry("keluar")}
            >
              Tambah Pengeluaran
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => openEntry("masuk")}
            >
              Tambah Pemasukan
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        {view ? <CashBookSummaryCards summary={view.summary} /> : null}

        <CashBookFilters
          period={period}
          onPeriodChange={setPeriod}
          date={activeDate}
          month={activeMonth}
          year={activeYear}
          onDateChange={setDateInput}
          onMonthChange={setMonthInput}
          onYearChange={setYearInput}
          branchId={branchId}
          branches={branches}
          onBranchChange={setBranchId}
          canFilterBranch={isOwner}
          onManageCategories={() => setCategoryOpen(true)}
        />

        <Card className="flex flex-col gap-3.5 p-[18px]">
          <CardHeader
            title="Tabel Buku Kas"
            subtitle="Urut tanggal. Rekap penjualan bersifat otomatis dan tidak bisa diedit."
            action={
              loading ? (
                <span className="text-meta text-ink-muted">Memuat…</span>
              ) : null
            }
          />

          {view && view.rows.length > 0 ? (
            <CashBookTable
              rows={view.rows}
              canManage={permissions.canAccessCashBook}
              onEdit={handleEditRow}
              onDelete={handleDeleteRow}
            />
          ) : (
            <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
              {loading
                ? "Memuat data buku kas…"
                : "Belum ada pemasukan atau pengeluaran pada periode ini."}
            </div>
          )}
        </Card>

        {period === "tahunan" && view ? (
          <CashBookYearlyRecap
            rows={view.monthlyRecap}
            saldoAwal={view.summary.saldoAwal}
            saldoAkhir={view.summary.saldoAkhir}
          />
        ) : null}
      </div>

      {drawer.open ? (
        <CashBookEntryDrawer
          type={drawer.type}
          entry={drawer.entry}
          categories={source?.categories ?? []}
          branches={source?.branches ?? []}
          defaultBranchId={scope === "all" ? branch.id : scope}
          canChooseBranch={isOwner}
          today={today}
          onClose={() => setDrawer(CLOSED_DRAWER)}
          onSaved={reload}
        />
      ) : null}

      {categoryOpen ? (
        <CashBookCategoryModal
          categories={source?.categories ?? []}
          onClose={() => setCategoryOpen(false)}
          onSaved={reload}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus entri buku kas?"
        description={
          deleteTarget
            ? `${deleteTarget.description} · ${formatRupiah(deleteTarget.amount)}`
            : ""
        }
        confirmLabel={deleting ? "Menghapus…" : "Hapus entri"}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
