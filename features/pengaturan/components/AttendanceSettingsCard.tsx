"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { updateAttendanceSettings } from "@/features/pengaturan/data/pengaturan-repository";
import type { AttendanceSettings } from "@/lib/store/types";

interface AttendanceSettingsCardProps {
  settings: AttendanceSettings;
}

export function AttendanceSettingsCard({
  settings,
}: AttendanceSettingsCardProps) {
  const { showToast } = useToast();
  const [workStartTime, setWorkStartTime] = useState(settings.workStartTime);
  const [workEndTime, setWorkEndTime] = useState(settings.workEndTime);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      updateAttendanceSettings({ workStartTime, workEndTime });
      showToast(
        `Jam kerja ${workStartTime}–${workEndTime} disimpan`,
        "success",
      );
      setError("");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Jam kerja gagal disimpan";
      setError(message);
      showToast(message, "error");
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="m-0 text-card-title font-bold text-ink">
          Jam Kerja & Absensi
        </h2>
        <p className="mt-0.5 mb-0 text-label text-ink-muted">
          Absen masuk setelah jam masuk dihitung sebagai Telat.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Jam masuk" labelSize="sm">
            <Input
              type="time"
              value={workStartTime}
              onChange={(event) => setWorkStartTime(event.target.value)}
            />
          </Field>
          <Field label="Jam pulang" labelSize="sm">
            <Input
              type="time"
              value={workEndTime}
              onChange={(event) => setWorkEndTime(event.target.value)}
            />
          </Field>
        </div>

        {error ? (
          <p className="m-0 text-label font-semibold text-danger-ink">{error}</p>
        ) : null}

        <div className="flex justify-end">
          <Button variant="primary" size="md" type="submit">
            Simpan Jam Kerja
          </Button>
        </div>
      </form>
    </Card>
  );
}
