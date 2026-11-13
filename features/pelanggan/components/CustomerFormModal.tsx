"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import type { CustomerRow } from "@/features/pelanggan/types";

interface CustomerFormModalProps {
  customer: CustomerRow | null;
  canSetTempo: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: {
    id?: string;
    name: string;
    phone: string;
    address: string;
    npwp: string;
    allowTempo: boolean;
  }) => void;
}

/** Form pelanggan; penanda boleh tempo hanya aktif untuk role berwenang. */
export function CustomerFormModal({
  customer,
  canSetTempo,
  saving,
  onClose,
  onSubmit,
}: CustomerFormModalProps) {
  // Komponen dipasang ulang setiap modal dibuka, jadi nilai awal aman dibaca
  // langsung dari props tanpa effect penyelaras state.
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [npwp, setNpwp] = useState(customer?.npwp ?? "");
  const [allowTempo, setAllowTempo] = useState(customer?.allowTempo ?? false);

  function handleSubmit() {
    onSubmit({ id: customer?.id, name, phone, address, npwp, allowTempo });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={customer ? "Ubah pelanggan" : "Pelanggan baru"}
      description="Data pelanggan dipakai untuk pesanan COD/Tempo dan riwayat penjualan."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={saving || name.trim().length < 2}
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="Nama pelanggan" labelSize="sm">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Toko Sinar Jaya"
            autoFocus
          />
        </Field>

        <Field label="No. HP (opsional)" labelSize="sm">
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="08xxxxxxxxxx"
            inputMode="tel"
          />
        </Field>

        <Field label="Alamat (opsional)" labelSize="sm">
          <Textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Alamat pelanggan untuk invoice dan surat jalan"
            rows={2}
          />
        </Field>

        <Field label="NPWP (opsional)" labelSize="sm">
          <Input
            value={npwp}
            onChange={(event) => setNpwp(event.target.value)}
            placeholder="00.000.000.0-000.000"
          />
        </Field>

        <label className="flex items-start gap-3 rounded-control border border-line bg-canvas px-3 py-3">
          <input
            type="checkbox"
            checked={allowTempo}
            disabled={!canSetTempo || saving}
            onChange={(event) => setAllowTempo(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand disabled:cursor-not-allowed"
          />
          <span className="min-w-0">
            <span className="block text-label font-semibold text-ink">
              Boleh bayar tempo
            </span>
            <span className="block text-meta text-ink-muted">
              {canSetTempo
                ? "Aktifkan hanya untuk pelanggan yang memang diperbolehkan berutang."
                : "Hanya role berwenang yang bisa mengubah penanda ini."}
            </span>
          </span>
        </label>
      </div>
    </Modal>
  );
}
