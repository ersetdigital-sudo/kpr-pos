"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { updateBusinessProfile } from "@/features/pengaturan/data/pengaturan-repository";
import type { BusinessProfile } from "@/lib/store/types";

interface BusinessProfileCardProps {
  business: BusinessProfile;
}

export function BusinessProfileCard({ business }: BusinessProfileCardProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(business.name);
  const [address, setAddress] = useState(business.address);
  const [phone, setPhone] = useState(business.phone);
  const [logoUrl, setLogoUrl] = useState(business.logoUrl ?? "");
  const [error, setError] = useState("");

  function handleLogoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 200_000) {
      setError("Ukuran logo maksimal 200 KB");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(String(reader.result ?? ""));
      setError("");
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      updateBusinessProfile({ name, address, phone, logoUrl });
      showToast("Profil usaha diperbarui", "success");
      setError("");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Profil gagal disimpan";
      setError(message);
      showToast(message, "error");
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="m-0 text-card-title font-bold text-ink">
          Profil Usaha
        </h2>
        <p className="mt-0.5 mb-0 text-label text-ink-muted">
          Nama dan logo dipakai di sidebar serta struk.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-canvas">
            <Image
              src={logoUrl || "/logo-kpr.png"}
              alt="Logo usaha"
              width={80}
              height={80}
              unoptimized
              className="h-20 w-20 object-contain p-1"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoFile}
              aria-label="Unggah logo usaha"
              className="text-meta text-ink-muted"
            />
            {logoUrl ? (
              <Button
                variant="outline"
                size="sm"
                className="w-fit h-[30px] px-2.5 text-meta"
                onClick={() => setLogoUrl("")}
              >
                Hapus logo
              </Button>
            ) : null}
            <span className="text-meta text-ink-muted">
              PNG/JPG, maksimal 200 KB.
            </span>
          </div>
        </div>

        <Field label="Nama usaha" labelSize="sm">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="CV. Contoh Sejahtera"
          />
        </Field>

        <Field label="Alamat" labelSize="sm">
          <Textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            rows={2}
            className="text-label"
          />
        </Field>

        <Field label="No. telp" labelSize="sm">
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
          />
        </Field>

        {error ? (
          <p className="m-0 text-label font-semibold text-danger-ink">{error}</p>
        ) : null}

        <div className="flex justify-end">
          <Button variant="primary" size="md" type="submit">
            Simpan Profil
          </Button>
        </div>
      </form>
    </Card>
  );
}
