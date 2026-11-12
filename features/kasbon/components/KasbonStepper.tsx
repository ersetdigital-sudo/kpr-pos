"use client";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatDateTimeShort } from "@/lib/format";
import { buildStageStates } from "@/features/kasbon/data/kasbon-calculations";
import type { KasbonRow } from "@/features/kasbon/types";

interface KasbonStepperProps {
  row: KasbonRow;
}

/**
 * Indikator tiga tahap persetujuan: selesai (centang), berjalan (disorot),
 * menunggu (redup), dan ditolak (bahaya). Status selalu punya teks, bukan
 * hanya warna.
 */
export function KasbonStepper({ row }: KasbonStepperProps) {
  const steps = buildStageStates(row);

  return (
    <ol className="m-0 flex list-none items-start gap-1.5 p-0">
      {steps.map((step, index) => {
        const done = step.state === "selesai";
        const running = step.state === "berjalan";
        const rejected = step.state === "ditolak";

        return (
          <li key={step.stage} className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-meta font-bold",
                  done && "border-success bg-success-soft text-success-ink",
                  running && "border-brand bg-brand-soft text-brand",
                  rejected &&
                    "border-danger-line bg-danger-soft text-danger-ink",
                  step.state === "menunggu" &&
                    "border-line bg-canvas text-ink-muted",
                )}
              >
                {done ? (
                  <Icon name="check" size={13} strokeWidth={2.4} />
                ) : rejected ? (
                  <Icon name="close" size={12} strokeWidth={2.4} />
                ) : (
                  index + 1
                )}
              </span>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-[2px] w-full rounded-pill",
                    done ? "bg-success" : "bg-line",
                  )}
                />
              ) : null}
            </div>

            <div className="min-w-0 pr-1">
              <div
                className={cn(
                  "truncate text-meta font-semibold",
                  done && "text-success-ink",
                  running && "text-brand",
                  rejected && "text-danger-ink",
                  step.state === "menunggu" && "text-ink-muted",
                )}
              >
                {step.stage}
              </div>
              {step.approval ? (
                <div
                  className="truncate text-meta text-ink-muted"
                  title={`${step.approval.decidedByName || "—"} · ${formatDateTimeShort(step.approval.decidedAt)}`}
                >
                  {step.approval.decidedByName || "—"} ·{" "}
                  {formatDateTimeShort(step.approval.decidedAt)}
                </div>
              ) : (
                <div className="truncate text-meta text-ink-muted">
                  {running ? "Menunggu" : "Belum"}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
