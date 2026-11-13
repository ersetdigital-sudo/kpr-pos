"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { updateBranchDocumentProfile } from "@/features/pengaturan/data/pengaturan-repository";
import type { Branch, BranchDocumentProfile } from "@/lib/store/types";

const EMPTY_PROFILE: BranchDocumentProfile = {
  businessName: "",
  businessAddress: "",
  businessPhone: "",
  npwp: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
};

interface BranchDocumentSettingsCardProps {
  branches: readonly Branch[];
  activeBranchId: string;
}

/** Kop dokumen per cabang; bagian kosong otomatis disembunyikan saat cetak. */
export function BranchDocumentSettingsCard({
  branches,
  activeBranchId,
}: BranchDocumentSettingsCardProps) {
  const initialBranchId =
    branches.find((branch) => branch.id === activeBranchId)?.id ??
    branches[0]?.id ??
    "";
  const [branchId, setBranchId] = useState(initialBranchId);
  const selectedBranch = branches.find((branch) => branch.id === branchId);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="m-0 text-card-title font-bold text-ink">
          Kop Dokumen Cabang
        </h2>
        <p className="mt-0.5 mb-0 text-label text-ink-muted">
          Dipakai di invoice dan surat jalan. Bagian yang dikosongkan tidak
          dicetak.
        </p>
      </div>

      <Field label="Cabang" labelSize="sm">
        <Select
          value={branchId}
          onChange={(event) => setBranchId(event.target.value)}
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
      </Field>

      {selectedBranch ? (
        <BranchDocumentForm
          key={selectedBranch.id}
          branch={selectedBranch}
        />
      ) : null}
    </Card>
  );
}

function BranchDocumentForm({ branch }: { branch: Branch }) {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<BranchDocumentProfile>(
    branch.documentProfile ?? EMPTY_PROFILE,
  );
  const [saving, setSaving] = useState(false);

  function update<K extends keyof BranchDocumentProfile>(
    key: K,
    value: BranchDocumentProfile[K],
  ) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);

    try {
      await updateBranchDocumentProfile(branch.id, profile);
      showToast(`Kop dokumen ${branch.name} disimpan`, "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Kop dokumen gagal disimpan",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama usaha" labelSize="sm" className="sm:col-span-2">
          <Input
            value={profile.businessName}
            onChange={(event) => update("businessName", event.target.value)}
            placeholder="CV. Karya Putra Ragil"
            disabled={saving}
          />
        </Field>

        <Field label="Alamat lengkap" labelSize="sm" className="sm:col-span-2">
          <Textarea
            value={profile.businessAddress}
            onChange={(event) =>
              update("businessAddress", event.target.value)
            }
            placeholder="Jalan, desa, kecamatan, kabupaten, kode pos"
            rows={2}
            disabled={saving}
          />
        </Field>

        <Field label="Telepon" labelSize="sm">
          <Input
            value={profile.businessPhone}
            onChange={(event) => update("businessPhone", event.target.value)}
            placeholder="0851xxxxxxxx / 0812xxxxxxxx"
            inputMode="tel"
            disabled={saving}
          />
        </Field>

        <Field label="NPWP" labelSize="sm">
          <Input
            value={profile.npwp}
            onChange={(event) => update("npwp", event.target.value)}
            placeholder="00.000.000.0-000.000"
            disabled={saving}
          />
        </Field>

        <Field label="Nama bank" labelSize="sm">
          <Input
            value={profile.bankName}
            onChange={(event) => update("bankName", event.target.value)}
            placeholder="BANK BNI"
            disabled={saving}
          />
        </Field>

        <Field label="Nomor rekening" labelSize="sm">
          <Input
            value={profile.bankAccountNumber}
            onChange={(event) =>
              update("bankAccountNumber", event.target.value)
            }
            placeholder="1989116106"
            inputMode="numeric"
            disabled={saving}
          />
        </Field>

        <Field
          label="Atas nama rekening"
          labelSize="sm"
          className="sm:col-span-2"
        >
          <Input
            value={profile.bankAccountHolder}
            onChange={(event) =>
              update("bankAccountHolder", event.target.value)
            }
            placeholder="CV. Karya Putra Ragil"
            disabled={saving}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-meta text-ink-muted">
          Surat jalan versi dot matrix selalu hitam-putih dan tanpa logo.
        </p>
        <Button type="submit" variant="primary" size="sm" disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan kop"}
        </Button>
      </div>
    </form>
  );
}
