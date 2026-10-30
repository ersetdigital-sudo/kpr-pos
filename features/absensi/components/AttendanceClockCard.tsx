"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AttendanceDisplayStatus } from "@/lib/store/types";

const STATUS_TONES: Record<AttendanceDisplayStatus, BadgeTone> = {
  Hadir: "success",
  Telat: "warning",
  Izin: "info",
  Sakit: "warning",
  Alpa: "danger",
  "Belum absen": "neutral",
};

interface AttendanceClockCardProps {
  employeeName: string;
  branchName: string;
  workStartTime: string;
  workEndTime: string;
  status: AttendanceDisplayStatus;
  checkIn: string | null;
  checkOut: string | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
}

export function AttendanceClockCard({
  employeeName,
  branchName,
  workStartTime,
  workEndTime,
  status,
  checkIn,
  checkOut,
  onCheckIn,
  onCheckOut,
}: AttendanceClockCardProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Card className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 p-5">
      <div>
        <h2 className="m-0 text-card-title font-bold text-ink">Absensi Saya</h2>
        <p className="mt-0.5 mb-0 text-label text-ink-muted">
          {employeeName} · {branchName}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-control bg-canvas px-4 py-3">
        <div>
          <div className="text-[42px] leading-none font-extrabold tracking-tight text-ink">
            {formatTime(now)}
          </div>
          <div className="mt-1 text-meta text-ink-muted">
            Jam kerja {workStartTime} – {workEndTime}
          </div>
        </div>
        <StatusBadge
          tone={STATUS_TONES[status]}
          className="px-2.5 py-1 text-label"
        >
          {status}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-control border border-line px-3 py-2.5">
          <div className="text-meta text-ink-muted">Jam masuk</div>
          <div className="mt-0.5 text-amount font-bold text-ink">
            {checkIn ?? "—"}
          </div>
        </div>
        <div className="rounded-control border border-line px-3 py-2.5">
          <div className="text-meta text-ink-muted">Jam pulang</div>
          <div className="mt-0.5 text-amount font-bold text-ink">
            {checkOut ?? "—"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="md"
          className={cn("flex-1", checkIn && "opacity-60")}
          disabled={checkIn !== null}
          onClick={onCheckIn}
        >
          Masuk
        </Button>
        <Button
          variant="outline"
          size="md"
          className="flex-1"
          disabled={!checkIn || checkOut !== null}
          onClick={onCheckOut}
        >
          Pulang
        </Button>
      </div>
    </Card>
  );
}
