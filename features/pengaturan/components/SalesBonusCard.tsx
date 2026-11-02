"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { describeBonusRule } from "@/features/pesanan/data/pesanan-calculations";
import { updateSalesBonus } from "@/features/pengaturan/data/pengaturan-repository";
import type { SalesBonusSettings, SalesBonusType } from "@/lib/store/types";

interface TierDraft {
  minQuantity: string;
  amountPerPiece: number;
}

interface SalesBonusCardProps {
  settings: SalesBonusSettings;
}

export function SalesBonusCard({ settings }: SalesBonusCardProps) {
  const { showToast } = useToast();
  const [type, setType] = useState<SalesBonusType>(settings.type);
  const [perPieceAmount, setPerPieceAmount] = useState(
    settings.perPieceAmount,
  );
  const [percentRate, setPercentRate] = useState(String(settings.percentRate));
  const [tiers, setTiers] = useState<TierDraft[]>(
    settings.tiers.map((tier) => ({
      minQuantity: String(tier.minQuantity),
      amountPerPiece: tier.amountPerPiece,
    })),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const draft: SalesBonusSettings = {
    type,
    perPieceAmount,
    percentRate: Number(percentRate || 0),
    tiers: tiers.map((tier) => ({
      minQuantity: Number(tier.minQuantity || 0),
      amountPerPiece: tier.amountPerPiece,
    })),
  };

  function updateTier(index: number, patch: Partial<TierDraft>) {
    setTiers((current) =>
      current.map((tier, tierIndex) =>
        tierIndex === index ? { ...tier, ...patch } : tier,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);

    try {
      await updateSalesBonus(draft);
      showToast("Aturan bonus sales diperbarui", "success");
      setError("");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Bonus gagal disimpan";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="m-0 text-card-title font-bold text-ink">
          Bonus Sales
        </h2>
        <p className="mt-0.5 mb-0 text-label text-ink-muted">
          Dihitung otomatis dari pesanan lunas dan transaksi kasir yang memakai
          sales.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Field label="Jenis aturan" labelSize="sm">
          <Select
            value={type}
            onChange={(event) => setType(event.target.value as SalesBonusType)}
          >
            <option value="per_piece">Per pcs (nominal tetap)</option>
            <option value="percent">Persen dari nominal penjualan</option>
            <option value="tiered">Bertingkat berdasarkan target pcs</option>
          </Select>
        </Field>

        {type === "per_piece" ? (
          <Field label="Bonus per pcs (Rp)" labelSize="sm">
            <CurrencyInput
              value={perPieceAmount}
              onValueChange={setPerPieceAmount}
              placeholder="0"
            />
          </Field>
        ) : null}

        {type === "percent" ? (
          <Field label="Persentase dari nominal (%)" labelSize="sm">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.1"
              inputMode="decimal"
              value={percentRate}
              onChange={(event) => setPercentRate(event.target.value)}
            />
          </Field>
        ) : null}

        {type === "tiered" ? (
          <div className="flex flex-col gap-2">
            <span className="text-label font-semibold text-ink-soft">
              Tingkat target (pcs per bulan)
            </span>
            {tiers.length === 0 ? (
              <div className="rounded-control border border-dashed border-line-strong bg-canvas px-3 py-4 text-center text-label text-ink-muted">
                Belum ada tingkat. Tambahkan minimal satu.
              </div>
            ) : null}
            {tiers.map((tier, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
              >
                <Field label="Target minimal" labelSize="xs">
                  <Input
                    type="number"
                    min={0}
                    value={tier.minQuantity}
                    onChange={(event) =>
                      updateTier(index, { minQuantity: event.target.value })
                    }
                    className="h-10 text-label"
                  />
                </Field>
                <Field label="Bonus / pcs (Rp)" labelSize="xs">
                  <CurrencyInput
                    value={tier.amountPerPiece}
                    onValueChange={(value) =>
                      updateTier(index, { amountPerPiece: value })
                    }
                    placeholder="0"
                    className="h-10 text-label"
                  />
                </Field>
                <Button
                  variant="dangerOutline"
                  size="sm"
                  className="h-10 px-2.5 text-meta"
                  onClick={() =>
                    setTiers((current) =>
                      current.filter((_, tierIndex) => tierIndex !== index),
                    )
                  }
                >
                  Hapus
                </Button>
              </div>
            ))}
            <Button
              variant="dashed"
              size="sm"
              className="w-fit"
              onClick={() =>
                setTiers((current) => [
                  ...current,
                  { minQuantity: "", amountPerPiece: 0 },
                ])
              }
            >
              + Tambah tingkat
            </Button>
          </div>
        ) : null}

        <p className="m-0 rounded-control bg-brand-soft px-3 py-2 text-label text-brand-strong">
          Perkiraan aturan aktif: {describeBonusRule(draft)}
        </p>

        {error ? (
          <p className="m-0 text-label font-semibold text-danger-ink">{error}</p>
        ) : null}

        <div className="flex justify-end">
          <Button variant="primary" size="md" type="submit" disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan Bonus"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
