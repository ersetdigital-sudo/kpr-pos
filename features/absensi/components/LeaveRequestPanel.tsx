"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import type { BadgeTone } from "@/components/ui/badge-tone";
import {
  reviewLeaveRequest,
  submitLeaveRequest,
} from "@/features/absensi/data/absensi-repository";
import type { LeaveRequestRow } from "@/features/absensi/types";
import type { LeaveRequestStatus } from "@/lib/store/types";
import { formatDateShort } from "@/lib/format";

const STATUS_TONES: Record<LeaveRequestStatus, BadgeTone> = {
  Menunggu: "warning",
  Disetujui: "success",
  Ditolak: "danger",
};

interface LeaveRequestPanelProps {
  rows: readonly LeaveRequestRow[];
  canApprove: boolean;
  today: string;
}

export function LeaveRequestPanel({
  rows,
  canApprove,
  today,
}: LeaveRequestPanelProps) {
  const { showToast } = useToast();
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      submitLeaveRequest({ date, reason });
      showToast("Pengajuan izin terkirim, menunggu persetujuan", "success");
      setReason("");
      setError("");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Pengajuan izin gagal";
      setError(message);
      showToast(message, "error");
    }
  }

  function handleReview(row: LeaveRequestRow, status: "Disetujui" | "Ditolak") {
    try {
      reviewLeaveRequest(row.id, status);
      showToast(
        `Izin ${row.employeeName} ${formatDateShort(row.date)} ${status.toLowerCase()}`,
        "success",
      );
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Pengajuan gagal diproses",
        "error",
      );
    }
  }

  return (
    <Card className="flex min-w-0 flex-[2_1_460px] flex-col gap-4 p-5">
      <div>
        <h2 className="m-0 text-card-title font-bold text-ink">
          Pengajuan Izin
        </h2>
        <p className="mt-0.5 mb-0 text-label text-ink-muted">
          {canApprove
            ? "Setujui atau tolak pengajuan izin karyawan."
            : "Ajukan izin minimal sehari sebelumnya."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-2.5 sm:grid-cols-[150px_1fr_auto] sm:items-end"
      >
        <Field label="Tanggal" labelSize="sm">
          <Input
            type="date"
            value={date}
            min={today}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 text-label"
          />
        </Field>
        <Field label="Alasan" labelSize="sm">
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Contoh: acara keluarga"
            rows={1}
            className="min-h-10 text-label"
          />
        </Field>
        <Button variant="primary" size="md" type="submit">
          Ajukan
        </Button>
      </form>

      {error ? (
        <p className="m-0 text-label font-semibold text-danger-ink">{error}</p>
      ) : null}

      <div className="flex flex-col divide-y divide-line-faint">
        {rows.length === 0 ? (
          <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-6 text-center text-body text-ink-muted">
            Belum ada pengajuan izin.
          </div>
        ) : null}

        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 py-2.5"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-body">
                <span className="font-semibold text-ink">
                  {canApprove ? row.employeeName : formatDateShort(row.date)}
                </span>
                {canApprove ? (
                  <span className="text-label text-ink-muted">
                    {formatDateShort(row.date)}
                  </span>
                ) : null}
                <StatusBadge tone={STATUS_TONES[row.status]}>
                  {row.status}
                </StatusBadge>
              </div>
              <div className="mt-0.5 text-label text-ink-muted">
                {row.reason}
                {row.reviewedByName
                  ? ` · diproses ${row.reviewedByName}`
                  : ""}
              </div>
            </div>

            {canApprove && row.status === "Menunggu" ? (
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[32px] px-2.5 text-meta"
                  onClick={() => handleReview(row, "Disetujui")}
                >
                  Setujui
                </Button>
                <Button
                  variant="dangerOutline"
                  size="sm"
                  className="h-[32px] px-2.5 text-meta"
                  onClick={() => handleReview(row, "Ditolak")}
                >
                  Tolak
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
