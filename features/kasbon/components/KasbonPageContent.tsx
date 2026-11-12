"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
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
import {
  reviewKasbon,
  settleKasbon,
} from "@/features/kasbon/data/kasbon-repository";
import { KasbonApprovalQueue } from "@/features/kasbon/components/KasbonApprovalQueue";
import { KasbonFormDialog } from "@/features/kasbon/components/KasbonFormDialog";
import { KasbonList } from "@/features/kasbon/components/KasbonList";
import { KasbonReviewDialog } from "@/features/kasbon/components/KasbonReviewDialog";
import { KasbonSettleDialog } from "@/features/kasbon/components/KasbonSettleDialog";
import { KasbonStatsCards } from "@/features/kasbon/components/KasbonStatsCards";
import { useKasbonData } from "@/features/kasbon/data/kasbon-repository";
import {
  usePermissions,
  useSession,
} from "@/features/session/data/session-repository";
import { toDateInputValue } from "@/lib/date-range";
import { formatRupiah } from "@/lib/format";
import type {
  KasbonDecision,
  KasbonRow,
  KasbonStage,
} from "@/features/kasbon/types";

interface ReviewTarget {
  row: KasbonRow;
  stage: KasbonStage;
  decision: KasbonDecision;
}

export function KasbonPageContent() {
  const database = useKasbonData();
  const { employee, branch } = useSession();
  const permissions = usePermissions();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [review, setReview] = useState<ReviewTarget | null>(null);
  const [settleTarget, setSettleTarget] = useState<KasbonRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const today = database ? toDateInputValue(new Date()) : "";

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

  const seesAll = canSeeAllKasbon(permissions);

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

  return (
    <>
      <PageHeader
        title="Kasbon"
        subtitle={
          seesAll
            ? "Semua pengajuan kasbon karyawan dan antrean persetujuannya"
            : "Pengajuan kasbonmu beserta status persetujuannya"
        }
        actions={
          <>
            {stats.awaitingMyApproval > 0 ? (
              <Chip tone="warning" dot>
                {stats.awaitingMyApproval} menunggu persetujuanmu
              </Chip>
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
        />

        {activeMine ? (
          <p className="m-0 text-meta text-ink-muted">
            Kasbon aktif kamu: {formatRupiah(activeMine.amount)} ·{" "}
            {activeMine.status}. Pengajuan baru bisa dibuat setelah kasbon itu
            lunas atau ditolak.
          </p>
        ) : null}
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
    </>
  );
}
