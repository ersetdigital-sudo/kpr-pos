"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDateLong, formatRupiah } from "@/lib/format";
import {
  estimateDueDate,
  repaymentLabel,
} from "@/features/kasbon/data/kasbon-calculations";
import { submitKasbon } from "@/features/kasbon/data/kasbon-repository";
import type {
  KasbonRepaymentMethod,
  KasbonRow,
  KasbonTempoUnit,
} from "@/features/kasbon/types";

interface KasbonFormProps {
  /** Kasbon aktif milik pemohon; bila ada, pengajuan baru ditolak. */
  activeKasbon: KasbonRow | null;
  /** Tanggal hari ini (YYYY-MM-DD) setelah data ter-hydrate. */
  today: string;
  onSaved?: () => void;
}

const METHODS: readonly {
  id: KasbonRepaymentMethod;
  label: string;
}[] = [
  { id: "potong_gaji", label: "Potong gaji" },
  { id: "tempo", label: "Tempo" },
];

const UNITS: readonly { id: KasbonTempoUnit; label: string }[] = [
  { id: "hari", label: "Hari" },
  { id: "minggu", label: "Minggu" },
];

/** Form pengajuan kasbon dengan validasi inline, bukan alert. */
export function KasbonForm({
  activeKasbon,
  today,
  onSaved,
}: KasbonFormProps) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<KasbonRepaymentMethod>("potong_gaji");
  const [tempoValue, setTempoValue] = useState<number>(0);
  const [tempoUnit, setTempoUnit] = useState<KasbonTempoUnit>("hari");
  const [errors, setErrors] = useState<{
    amount?: string;
    reason?: string;
    tempo?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  const estimation =
    method === "tempo" && tempoValue > 0
      ? estimateDueDate(today || "2000-01-01", tempoValue, tempoUnit)
      : null;
  const blocked = activeKasbon !== null;

  function validate(): boolean {
    const next: typeof errors = {};

    if (amount <= 0) next.amount = "Nominal harus lebih dari 0.";
    if (reason.trim().length < 3) {
      next.reason = "Tulis alasan singkat, minimal 3 karakter.";
    }
    if (method === "tempo" && tempoValue <= 0) {
      next.tempo = "Isi jumlah tempo lebih dari 0.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (saving || blocked) return;
    if (!validate()) return;

    setSaving(true);

    try {
      await submitKasbon({
        amount,
        reason,
        repaymentMethod: method,
        tempoValue: method === "tempo" ? tempoValue : null,
        tempoUnit: method === "tempo" ? tempoUnit : null,
      });

      showToast(
        `Kasbon ${formatRupiah(amount)} diajukan ke Accounting`,
        "success",
      );
      setAmount(0);
      setReason("");
      setMethod("potong_gaji");
      setTempoValue(0);
      setTempoUnit("hari");
      onSaved?.();
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Kasbon gagal diajukan",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {blocked && activeKasbon ? (
        <div className="rounded-card border border-warning/40 bg-warning-soft px-3.5 py-3">
          <p className="m-0 text-label font-bold text-warning-ink">
            Masih ada kasbon aktif
          </p>
          <p className="mt-1 mb-0 text-meta text-warning-ink">
            {formatRupiah(activeKasbon.amount)} · {activeKasbon.status} ·{" "}
            {repaymentLabel(activeKasbon)}. Tunggu keputusan atau selesaikan
            kasbon itu sebelum mengajukan lagi.
          </p>
        </div>
      ) : null}

      <Field label="Nominal kasbon" labelSize="sm">
        <CurrencyInput
          aria-label="Nominal kasbon"
          value={amount}
          onValueChange={(value) => {
            setAmount(value);
            if (errors.amount) setErrors((current) => ({ ...current, amount: undefined }));
          }}
          placeholder="0"
          disabled={blocked || saving}
          className="h-[50px] text-right text-amount font-bold"
        />
        {errors.amount ? (
          <span className="text-meta font-semibold text-danger-ink">
            {errors.amount}
          </span>
        ) : (
          <span className="text-meta text-ink-muted">
            Nominal bebas, tanpa batas.
          </span>
        )}
      </Field>

      <Field label="Alasan" labelSize="sm">
        <Textarea
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (errors.reason) {
              setErrors((current) => ({ ...current, reason: undefined }));
            }
          }}
          placeholder="Contoh: biaya berobat keluarga"
          rows={3}
          maxLength={200}
          disabled={blocked || saving}
        />
        {errors.reason ? (
          <span className="text-meta font-semibold text-danger-ink">
            {errors.reason}
          </span>
        ) : null}
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-label font-semibold text-ink-soft">
          Metode pelunasan
        </span>
        <div
          role="group"
          aria-label="Metode pelunasan"
          className="grid grid-cols-2 gap-1 rounded-control border border-line bg-canvas p-1"
        >
          {METHODS.map((option) => {
            const active = method === option.id;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                disabled={blocked || saving}
                onClick={() => setMethod(option.id)}
                className={cn(
                  "h-10 cursor-pointer rounded-control border-0 font-sans text-label font-semibold disabled:cursor-not-allowed disabled:opacity-60",
                  active
                    ? "bg-surface text-ink shadow-sm"
                    : "bg-transparent text-ink-muted",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {method === "tempo" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-label font-semibold text-ink-soft">
            Jangka waktu
          </span>
          <div className="flex gap-2">
            <Input
              aria-label="Jumlah tempo"
              type="number"
              min={1}
              inputMode="numeric"
              value={tempoValue > 0 ? tempoValue : ""}
              placeholder="7"
              disabled={blocked || saving}
              onChange={(event) => {
                const next = Number(event.target.value);
                setTempoValue(
                  Number.isFinite(next) ? Math.max(0, Math.round(next)) : 0,
                );
                if (errors.tempo) {
                  setErrors((current) => ({ ...current, tempo: undefined }));
                }
              }}
              className="w-[96px] px-3"
            />
            <div
              role="group"
              aria-label="Satuan tempo"
              className="grid flex-1 grid-cols-2 gap-1 rounded-control border border-line bg-canvas p-1"
            >
              {UNITS.map((unit) => {
                const active = tempoUnit === unit.id;

                return (
                  <button
                    key={unit.id}
                    type="button"
                    aria-pressed={active}
                    disabled={blocked || saving}
                    onClick={() => setTempoUnit(unit.id)}
                    className={cn(
                      "h-8 cursor-pointer rounded-control border-0 font-sans text-label font-semibold disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "bg-surface text-ink shadow-sm"
                        : "bg-transparent text-ink-muted",
                    )}
                  >
                    {unit.label}
                  </button>
                );
              })}
            </div>
          </div>
          {errors.tempo ? (
            <span className="text-meta font-semibold text-danger-ink">
              {errors.tempo}
            </span>
          ) : null}

          <div className="rounded-control bg-canvas px-3 py-2.5">
            <div className="text-meta text-ink-muted">Estimasi jatuh tempo</div>
            <div className="text-label font-bold text-ink">
              {estimation
                ? formatDateLong(estimation)
                : "Isi jumlah tempo untuk melihat estimasi"}
            </div>
            <div className="mt-0.5 text-meta text-ink-muted">
              Dihitung ulang dari tanggal persetujuan Owner.
            </div>
          </div>
        </div>
      ) : (
        <p className="m-0 rounded-control bg-canvas px-3 py-2.5 text-meta text-ink-muted">
          Potong gaji: kasbon ditandai lunas tanpa catatan Buku Kas. Metode tempo
          mencatat pelunasan sebagai pemasukan Buku Kas.
        </p>
      )}

      <Button
        variant="primary"
        size="lg"
        className="h-[50px] rounded-card text-amount"
        disabled={blocked || saving}
        onClick={handleSubmit}
      >
        {saving ? "Mengajukan…" : "Ajukan kasbon"}
      </Button>

      <p className="m-0 text-meta text-ink-muted">
        Setelah diajukan, status menjadi Menunggu Accounting lalu berlanjut ke
        Manager dan Owner. Penolakan di satu tahap langsung menghentikan
        pengajuan.
      </p>
    </div>
  );
}
