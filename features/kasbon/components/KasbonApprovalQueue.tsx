"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import type { RolePermissions } from "@/config/permissions";
import { formatDateTimeShort, formatRupiah } from "@/lib/format";
import {
  canReviewKasbon,
  canSettleKasbon,
  repaymentLabel,
} from "@/features/kasbon/data/kasbon-calculations";
import { KasbonStatusBadge } from "@/features/kasbon/components/KasbonStatusBadge";
import type { KasbonRow, KasbonStage } from "@/features/kasbon/types";

interface KasbonApprovalQueueProps {
  rows: readonly KasbonRow[];
  permissions: RolePermissions;
  currentEmployeeId: string;
  onApprove: (row: KasbonRow, stage: KasbonStage) => void;
  onReject: (row: KasbonRow, stage: KasbonStage) => void;
  onSettle: (row: KasbonRow) => void;
}

/** Antrean "Perlu persetujuan saya" untuk pemegang izin tiap tahap. */
export function KasbonApprovalQueue({
  rows,
  permissions,
  currentEmployeeId,
  onApprove,
  onReject,
  onSettle,
}: KasbonApprovalQueueProps) {
  if (rows.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3.5 p-[18px]">
      <CardHeader
        title="Perlu persetujuan saya"
        subtitle="Hanya kasbon yang boleh kamu proses di tahap saat ini."
        action={
          <span className="text-meta text-ink-muted">
            {rows.length} menunggu
          </span>
        }
      />

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row) => {
          const stage = canReviewKasbon(row, permissions, currentEmployeeId);
          const settleable = canSettleKasbon(row, permissions);

          return (
            <li
              key={row.id}
              className="flex flex-col gap-2.5 rounded-control border border-line bg-canvas px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-body font-semibold text-ink">
                    {row.employeeName}
                  </span>
                  <KasbonStatusBadge status={row.status} />
                </div>
                <div className="text-meta text-ink-muted">
                  {repaymentLabel(row)} · {formatDateTimeShort(row.createdAt)}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:shrink-0">
                <span className="mr-auto text-body font-bold whitespace-nowrap text-ink sm:mr-2">
                  {formatRupiah(row.amount)}
                </span>

                {stage ? (
                  <>
                    <Button
                      variant="primary"
                      size="md"
                      className="h-10 flex-1 sm:flex-none"
                      onClick={() => onApprove(row, stage)}
                    >
                      Setujui
                    </Button>
                    <Button
                      variant="dangerOutline"
                      size="md"
                      className="h-10 flex-1 sm:flex-none"
                      onClick={() => onReject(row, stage)}
                    >
                      Tolak
                    </Button>
                  </>
                ) : null}

                {settleable ? (
                  <Button
                    variant="outline"
                    size="md"
                    className="h-10 flex-1 sm:flex-none"
                    onClick={() => onSettle(row)}
                  >
                    Tandai lunas
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
