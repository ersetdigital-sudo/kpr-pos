"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  createBranch,
  updateBranch,
} from "@/features/cabang/data/cabang-repository";
import type { BranchRow } from "@/features/cabang/types";

interface BranchFormDrawerProps {
  open: boolean;
  branch: BranchRow | null;
  onClose: () => void;
}

export function BranchFormDrawer({
  open,
  branch,
  onClose,
}: BranchFormDrawerProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [phone, setPhone] = useState(branch?.phone ?? "");
  const [error, setError] = useState("");

  const isEditing = branch !== null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const input = { name, address, phone };

      if (isEditing && branch) {
        updateBranch(branch.id, input);
        showToast(`Cabang ${name.trim()} diperbarui`, "success");
      } else {
        createBranch(input);
        showToast(
          `Cabang ${name.trim()} ditambahkan dengan stok 0 untuk semua produk`,
          "success",
        );
      }
      onClose();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Cabang gagal disimpan";
      setError(message);
      showToast(message, "error");
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Cabang" : "Tambah Cabang"}
      description={
        isEditing
          ? "Alamat dan no. telp dipakai pada struk cabang."
          : "Stok semua produk otomatis dibuat 0 dan bisa diisi lewat Stok Masuk."
      }
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" type="submit" form="branch-form">
            {isEditing ? "Simpan Perubahan" : "Simpan Cabang"}
          </Button>
        </>
      }
    >
      <form
        id="branch-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-3.5"
      >
        <Field label="Nama cabang" labelSize="sm">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Cabang Surabaya"
            autoFocus
          />
        </Field>

        <Field label="Alamat" labelSize="sm">
          <Textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Jl. Contoh No. 10, Kota"
            rows={2}
            className="text-label"
          />
        </Field>

        <Field label="No. telp" labelSize="sm">
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="031-1234567"
            inputMode="tel"
          />
        </Field>

        {error ? (
          <p className="m-0 rounded-control bg-danger-soft px-3 py-2 text-label font-semibold text-danger-ink">
            {error}
          </p>
        ) : null}
      </form>
    </Drawer>
  );
}
