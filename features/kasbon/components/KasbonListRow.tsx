"use client";

import { Button } from "@/components/ui/Button";
import type { RolePermissions } from "@/config/permissions";
import { cn } from "@/lib/cn";
import { formatDateShort, formatDateTimeShort, formatRupiah } from "@/lib/format";
import {
  canReviewKasbon,
  canSettleKasbon,
  isKasbonOverdue,
  repaymentLabel,
} from "@/features/kasbon/data/kasbon-calculations";
import { KasbonStatusBadge } from "@/features/kasbon/components/KasbonStatusBadge";
import { KasbonStepper } from "@/features/kasbon/components/KasbonStepper";
import type { KasbonRow, KasbonStage } from "@/features/kasbon/types";

export interface KasbonItemProps {
  row: KasbonRow;
  permissions: RolePermissions;
  currentEmployeeId: string;
  today: string;
  onApprove: (row: KasbonRow, stage: KasbonStage) => void;
  onReject: (row: KasbonRow, stage: KasbonStage) => void;
  onSettle: (row: KasbonRow) => void;
}

function rejectionNote(row: KasbonRow): string | null {
  const rejected = row.approvals.find(
    (approval) => approval.decision === "Ditolak",
  );

  if (!rejected) return null;

  return `Ditolak di tahap ${rejected.stage}${rejected.note ? ` · ${rejected.note}` : ""}`;
}

function dueLabel(row: KasbonRow): string | null {
  if (row.repaymentMethod !== "tempo") return null;
  if (row.dueDate) return `Jatuh tempo ${formatDateShort(row.dueDate)}`;

  return "Jatuh tempo dihitung saat Owner menyetujui";
}

function OverdueBadge() {
  return (
    <span className="inline-flex items-center rounded-pill bg-danger-soft px-2 py-[3px] text-meta font-semibold text-danger-ink">
      Lewat jatuh tempo
    </span>
  );
}

function KasbonActions({
  row,
  stage,
  settleable,
  compact,
  onApprove,
  onReject,
  onSettle,
}: {
  row: KasbonRow;
  stage: KasbonStage | null;
  settleable: boolean;
  compact: boolean;
  onApprove: (row: KasbonRow, stage: KasbonStage) => void;
  onReject: (row: KasbonRow, stage: KasbonStage) => void;
  onSettle: (row: KasbonRow) => void;
}) {
  if (!stage && !settleable) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        compact && "border-t border-line-faint pt-3",
      )}
    >
      {stage ? (
        <>
          <Button
            variant="primary"
            size={compact ? "md" : "sm"}
            className={compact ? "h-10 flex-1" : "h-[32px] px-2.5 text-meta"}
            onClick={() => onApprove(row, stage)}
          >
            Setujui
          </Button>
          <Button
            variant="dangerOutline"
            size={compact ? "md" : "sm"}
            className={compact ? "h-10 flex-1" : "h-[32px] px-2.5 text-meta"}
            onClick={() => onReject(row, stage)}
          >
            Tolak
          </Button>
        </>
      ) : null}

      {settleable ? (
        <Button
          variant="outline"
          size={compact ? "md" : "sm"}
          className={
            compact ? "h-10 flex-1" : "h-[32px] px-2.5 text-meta"
          }
          onClick={() => onSettle(row)}
        >
          Tandai lunas
        </Button>
      ) : null}
    </div>
  );
}

/** Baris kasbon desktop: nominal paling menonjol, info lega. */
export function KasbonListRow(props: KasbonItemProps) {
  const { row, permissions, currentEmployeeId, today } = props;
  const stage = canReviewKasbon(row, permissions, currentEmployeeId);
  const settleable = canSettleKasbon(row, permissions);
  const overdue = isKasbonOverdue(row, today);
  const rejection = rejectionNote(row);

  return (
    <div className="hidden flex-col gap-2.5 px-4 py-3.5 transition-colors hover:bg-line-subtle lg:flex">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="m-0 truncate text-body font-semibold text-ink">
              {row.employeeName}
            </p>
            <span className="text-meta text-ink-muted">{row.branchName}</span>
            {overdue ? <OverdueBadge /> : null}
          </div>
          <p className="m-0 mt-0.5 line-clamp-2 text-meta text-ink-muted">
            {row.reason}
          </p>
          <p className="m-0 mt-0.5 text-meta text-ink-muted">
            {repaymentLabel(row)}
            {dueLabel(row) ? ` · ${dueLabel(row)}` : ""} ·{" "}
            {formatDateTimeShort(row.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-card-title font-extrabold whitespace-nowrap text-ink">
            {formatRupiah(row.amount)}
          </span>
          <KasbonStatusBadge status={row.status} />
        </div>
      </div>

      <KasbonStepper row={row} />

      {rejection ? (
        <p className="m-0 text-meta font-semibold text-danger-ink">
          {rejection}
        </p>
      ) : null}

      <div className="flex items-end justify-between gap-3">
        <span className="text-meta text-ink-muted">
          Diajukan {formatDateTimeShort(row.createdAt)}
        </span>
        <KasbonActions
          row={row}
          stage={stage}
          settleable={settleable}
          compact={false}
          onApprove={props.onApprove}
          onReject={props.onReject}
          onSettle={props.onSettle}
        />
      </div>
    </div>
  );
}

/** Kartu kasbon mobile: tanpa tabel dan tanpa scroll horizontal. */
export function KasbonCard(props: KasbonItemProps) {
  const { row, permissions, currentEmployeeId, today } = props;
  const stage = canReviewKasbon(row, permissions, currentEmployeeId);
  const settleable = canSettleKasbon(row, permissions);
  const overdue = isKasbonOverdue(row, today);
  const rejection = rejectionNote(row);

  return (
    <div className="flex flex-col gap-3 px-4 py-4 lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 truncate text-body font-semibold text-ink">
            {row.employeeName}
          </p>
          <p className="m-0 text-meta text-ink-muted">{row.branchName}</p>
        </div>
        <KasbonStatusBadge status={row.status} className="shrink-0" />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 text-meta text-ink-muted">
          <div className="text-label font-semibold text-ink">
            {repaymentLabel(row)}
          </div>
          {dueLabel(row) ? <div>{dueLabel(row)}</div> : null}
        </div>
        <span className="shrink-0 text-page-title font-extrabold whitespace-nowrap text-ink">
          {formatRupiah(row.amount)}
        </span>
      </div>

      <p className="m-0 line-clamp-2 text-meta text-ink-muted">{row.reason}</p>
      {overdue ? (
        <div>
          <OverdueBadge />
        </div>
      ) : null}

      <KasbonStepper row={row} />

      {rejection ? (
        <p className="m-0 text-meta font-semibold text-danger-ink">
          {rejection}
        </p>
      ) : null}

      <KasbonActions
        row={row}
        stage={stage}
        settleable={settleable}
        compact
        onApprove={props.onApprove}
        onReject={props.onReject}
        onSettle={props.onSettle}
      />
    </div>
  );
}
