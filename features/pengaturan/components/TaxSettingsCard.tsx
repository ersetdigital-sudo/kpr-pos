"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { updateTaxRate } from "@/features/pengaturan/data/pengaturan-repository";

interface TaxSettingsCardProps {
  rate: number;
}

/** Tarif PPN default; tiap transaksi tetap memilih pakai PPN atau tidak. */
export function TaxSettingsCard({ rate }: TaxSettingsCardProps) {
  const { showToast } = useToast();
  const [value, setValue] = useState(String(rate));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const parsed = Number(value.replace(",", "."));

    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setError("Tarif PPN harus antara 0 dan 100.");
      return;
    }

    setSaving(true);

    try {
      await updateTaxRate(parsed);
      setError("");
      showToast(`Tarif PPN ${parsed}% disimpan`, "success");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Tarif PPN gagal disimpan";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="m-0 text-card-title font-bold text-ink">PPN</h2>
        <p className="mt-0.5 mb-0 text-label text-ink-muted">
          Tarif default untuk transaksi dan pesanan baru. Harga jual dianggap
          belum termasuk PPN.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Field label="Tarif PPN (%)" labelSize="sm">
          <Input
            type="number"
            min={0}
            max={100}
            step="0.01"
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="px-3"
          />
        </Field>

        <p className="m-0 rounded-control bg-canvas px-3 py-2 text-meta text-ink-muted">
          PPN hanya dikenakan bila dipilih saat transaksi. Nilai tarif disalin
          ke transaksi/pesanan, jadi perubahan tarif tidak mengubah data lama.
        </p>

        {error ? (
          <p className="m-0 text-label font-semibold text-danger-ink">{error}</p>
        ) : null}

        <div className="flex justify-end">
          <Button variant="primary" size="md" type="submit" disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan Tarif PPN"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
