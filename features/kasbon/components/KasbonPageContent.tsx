"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import {
  buildKasbonRows,
  calculateKasbonStats,
  canReviewKasbon,
  canSeeAllKasbon,
  canSettleKasbon,
  findMyActiveKasbon,
  getVisibleKasbon,
} from "@/features/kasbon/data/kasbon-calculations";
import { buildKasbonRecap } from "@/features/kasbon/data/kasbon-recap-calculations";
import {
  exportKasbonRecap,
  logKasbonDetailPrint,
  logKasbonRecapPrint,
} from "@/features/kasbon/data/kasbon-recap-report";
import {
  reviewKasbon,
  settleKasbon,
  useKasbonData,
} from "@/features/kasbon/data/kasbon-repository";
import { KasbonApprovalQueue } from "@/features/kasbon/components/KasbonApprovalQueue";
import { KasbonDetailDialog } from "@/features/kasbon/components/KasbonDetailDialog";
import { KasbonDetailPrintSheet } from "@/features/kasbon/components/KasbonDetailPrintSheet";
import { KasbonFormDialog } from "@/features/kasbon/components/KasbonFormDialog";
import { KasbonList } from "@/features/kasbon/components/KasbonList";
import { KasbonRecapPrintSheet } from "@/features/kasbon/components/KasbonRecapPrintSheet";
import { KasbonRecapView } from "@/features/kasbon/components/KasbonRecapView";
import { KasbonReviewDialog } from "@/features/kasbon/components/KasbonReviewDialog";
import { KasbonSettleDialog } from "@/features/kasbon/components/KasbonSettleDialog";
import { KasbonStatsCards } from "@/features/kasbon/components/KasbonStatsCards";
import {
  usePermissions,
  useSession,
} from "@/features/session/data/session-repository";
import { toDateInputValue } from "@/lib/date-range";
import { formatRupiah } from "@/lib/format";
import type {
  KasbonDecision,
  KasbonRecapFilterState,
  KasbonRow,
  KasbonStage,
} from "@/features/kasbon/types";

interface ReviewTarget {
  row: KasbonRow;
  stage: KasbonStage;
  decision: KasbonDecision;
}

type KasbonView = "list" | "recap";

const VIEW_TABS: readonly TabItem<KasbonView>[] = [
  { id: "list", label: "Daftar" },
  { id: "recap", label: "Rekap" },
];

/** Bulan sengaja kosong agar `new Date()` tidak dibaca saat prerender. */
const INITIAL_RECAP_FILTERS: KasbonRecapFilterState = {
  periodMode: "month",
  month: "",
  start: "",
  end: "",
  branchId: "all",
  status: "all",
  employeeId: "all",
};

export function KasbonPageContent() {
  const database = useKasbonData();
  const { employee, branch, branches } = useSession();
  const permissions = usePermissions();
  const { showToast } = useToast();

  const [view, setView] = useState<KasbonView>("list");
  const [formOpen, setFormOpen] = useState(false);
  const [review, setReview] = useState<ReviewTarget | null>(null);
  const [settleTarget, setSettleTarget] = useState<KasbonRow | null>(null);
  const [detailRow, setDetailRow] = useState<KasbonRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recapFilters, setRecapFilters] =
    useState<KasbonRecapFilterState>(INITIAL_RECAP_FILTERS);

  const today = database ? toDateInputValue(new Date()) : "";
  const seesAll = canSeeAllKasbon(permissions);

  const rows = useMemo(
    () => (database ? buildKasbonRows(database) : []),
    [database],
  );
  const visibleRows = useMemo(
    () => getVisibleKasbon(rows, employee.id, permissions),
    [rows, employee.id, permissions],
  );
  const stats = useMemo(
    () => calculateKasbonStats(visibleRows, permissions, employee.id, today),
    [visibleRows, permissions, employee.id, today],
  );
  const queue = useMemo(
    () =>
      visibleRows.filter(
        (row) =>
          canReviewKasbon(row, permissions, employee.id) !== null ||
          canSettleKasbon(row, permissions),
      ),
    [visibleRows, permissions, employee.id],
  );
  const activeMine = useMemo(
    () => findMyActiveKasbon(rows, employee.id),
    [rows, employee.id],
  );

  // Nilai filter dinormalkan mengikuti izin cabang dan cakupan lihat kasbon.
  const recapFilterState = useMemo<KasbonRecapFilterState>(
    () => ({
      ...recapFilters,
      month: recapFilters.month || (today ? today.slice(0, 7) : ""),
      branchId: permissions.canViewAllBranches
        ? recapFilters.branchId
        : branch.id,
      employeeId: seesAll ? recapFilters.employeeId : employee.id,
    }),
    [
      recapFilters,
      today,
      permissions.canViewAllBranches,
      branch.id,
      seesAll,
      employee.id,
    ],
  );

  const recapEmployees = useMemo(() => {
    const names = new Map<string, string>();

    visibleRows.forEach((row) => {
      if (!names.has(row.employeeId)) names.set(row.employeeId, row.employeeName);
    });

    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [visibleRows]);

  const recapBranchLabel =
    recapFilterState.branchId === "all"
      ? "Semua cabang"
      : (branches.find((item) => item.id === recapFilterState.branchId)?.name ??
        branch.name);

  const recap = useMemo(
    () =>
      buildKasbonRecap(visibleRows, recapFilterState, {
        today,
        branchScope: recapFilterState.branchId,
        branchLabel: recapBranchLabel,
        employeeName:
          recapEmployees.find((item) => item.id === recapFilterState.employeeId)
            ?.name ?? null,
      }),
    [
      visibleRows,
      recapFilterState,
      today,
      recapBranchLabel,
      recapEmployees,
    ],
  );

  if (!database) {
    return (
      <>
        <PageHeader title="Kasbon" subtitle="Memuat data kasbon…" />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <div className="h-[92px] animate-pulse rounded-card border border-line bg-surface" />
          <div className="mt-4 h-[240px] animate-pulse rounded-card border border-line bg-surface" />
        </div>
      </>
    );
  }

  async function handleReview(note: string) {
    if (!review || submitting) return;

    setSubmitting(true);

    try {
      await reviewKasbon({
        kasbonId: review.row.id,
        stage: review.stage,
        decision: review.decision,
        note,
      });

      showToast(
        review.decision === "Ditolak"
          ? `Kasbon ${review.row.employeeName} ditolak`
          : `Kasbon ${review.row.employeeName} disetujui tahap ${review.stage}`,
        review.decision === "Ditolak" ? "info" : "success",
      );
      setReview(null);
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Keputusan gagal disimpan",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSettle() {
    if (!settleTarget || submitting) return;

    setSubmitting(true);

    try {
      await settleKasbon(settleTarget);
      showToast(
        settleTarget.repaymentMethod === "tempo"
          ? `Kasbon ${settleTarget.employeeName} lunas, pemasukan masuk Buku Kas`
          : `Kasbon ${settleTarget.employeeName} lunas (potong gaji)`,
        "success",
      );
      setSettleTarget(null);
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Kasbon gagal ditandai lunas",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExportExcel() {
    try {
      await exportKasbonRecap(recap);
      showToast("File Excel rekap kasbon berhasil dibuat", "success");
    } catch {
      showToast("Export Excel rekap kasbon gagal, coba lagi", "error");
    }
  }

  function handleExportPdf() {
    logKasbonRecapPrint(recap, "PDF");
    showToast("Menyiapkan PDF rekap kasbon, pilih Simpan sebagai PDF", "info");
    window.print();
  }

  function handlePrintRecap() {
    logKasbonRecapPrint(recap, "Cetak");
    showToast("Menyiapkan versi cetak rekap kasbon", "info");
    window.print();
  }

  function handlePrintDetail() {
    if (!detailRow) return;

    logKasbonDetailPrint(detailRow);
    showToast("Menyiapkan versi cetak detail kasbon", "info");
    window.print();
  }

  return (
    <>
      <PageHeader
        title="Kasbon"
        subtitle={
          seesAll
            ? "Semua pengajuan kasbon karyawan, antrean persetujuan, dan rekapnya"
            : "Pengajuan kasbonmu, status persetujuan, dan rekapnya"
        }
        actions={
          <>
            {view === "list" && stats.awaitingMyApproval > 0 ? (
              <Chip tone="warning" dot>
                {stats.awaitingMyApproval} menunggu persetujuanmu
              </Chip>
            ) : null}
            {view === "recap" ? (
              <>
                {permissions.canExportReports ? (
                  <>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={handleExportExcel}
                    >
                      Export Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={handleExportPdf}
                    >
                      Export PDF
                    </Button>
                  </>
                ) : null}
                <Button variant="outline" size="md" onClick={handlePrintRecap}>
                  Cetak
                </Button>
              </>
            ) : null}
            {permissions.canAccessKasbon ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setFormOpen(true)}
              >
                <Icon name="plus" size={16} strokeWidth={2} />
                Ajukan kasbon
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        <Tabs
          tabs={VIEW_TABS}
          value={view}
          onChange={setView}
          ariaLabel="Pilih tampilan kasbon"
        />

        {view === "list" ? (
          <>
            <KasbonStatsCards stats={stats} />

            <KasbonApprovalQueue
              rows={queue}
              permissions={permissions}
              currentEmployeeId={employee.id}
              onApprove={(row, stage) =>
                setReview({ row, stage, decision: "Disetujui" })
              }
              onReject={(row, stage) =>
                setReview({ row, stage, decision: "Ditolak" })
              }
              onSettle={setSettleTarget}
            />

            <KasbonList
              rows={visibleRows}
              permissions={permissions}
              currentEmployeeId={employee.id}
              today={today}
              title={seesAll ? "Semua kasbon" : "Kasbon saya"}
              canApply={permissions.canAccessKasbon}
              onApply={() => setFormOpen(true)}
              onApprove={(row, stage) =>
                setReview({ row, stage, decision: "Disetujui" })
              }
              onReject={(row, stage) =>
                setReview({ row, stage, decision: "Ditolak" })
              }
              onSettle={setSettleTarget}
              onViewDetail={setDetailRow}
            />

            {activeMine ? (
              <p className="m-0 text-meta text-ink-muted">
                Kasbon aktif kamu: {formatRupiah(activeMine.amount)} ·{" "}
                {activeMine.status}. Pengajuan baru bisa dibuat setelah kasbon itu
                lunas atau ditolak.
              </p>
            ) : null}
          </>
        ) : (
          <KasbonRecapView
            data={recap}
            filters={recapFilterState}
            onFiltersChange={setRecapFilters}
            branches={branches}
            canChooseBranch={permissions.canViewAllBranches}
            employees={recapEmployees}
            showEmployeeFilter={seesAll}
            onOpenDetail={setDetailRow}
          />
        )}
      </div>

      <KasbonFormDialog
        open={formOpen}
        branchName={branch.name}
        activeKasbon={activeMine}
        today={today}
        onClose={() => setFormOpen(false)}
      />

      {review ? (
        <KasbonReviewDialog
          row={review.row}
          stage={review.stage}
          decision={review.decision}
          submitting={submitting}
          onClose={() => setReview(null)}
          onConfirm={handleReview}
        />
      ) : null}

      {settleTarget ? (
        <KasbonSettleDialog
          row={settleTarget}
          submitting={submitting}
          onClose={() => setSettleTarget(null)}
          onConfirm={handleSettle}
        />
      ) : null}

      {detailRow ? (
        <KasbonDetailDialog
          row={detailRow}
          today={today}
          onPrint={handlePrintDetail}
          onClose={() => setDetailRow(null)}
        />
      ) : null}

      {detailRow ? (
        <KasbonDetailPrintSheet
          row={detailRow}
          business={database.settings.business}
          printedBy={employee.name}
        />
      ) : view === "recap" ? (
        <KasbonRecapPrintSheet
          data={recap}
          business={database.settings.business}
          printedBy={employee.name}
        />
      ) : null}
    </>
  );
}
