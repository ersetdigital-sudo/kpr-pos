"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import {
  saveCashBookCategory,
  setCashBookCategoryActive,
} from "@/features/buku-kas/data/repository";
import type {
  CashBookCategory,
  CashBookType,
} from "@/features/buku-kas/types";

const TYPE_TABS: readonly TabItem<CashBookType>[] = [
  { id: "masuk", label: "Pemasukan" },
  { id: "keluar", label: "Pengeluaran" },
];

interface CashBookCategoryModalProps {
  categories: readonly CashBookCategory[];
  onClose: () => void;
  onSaved: () => void;
}

export function CashBookCategoryModal({
  categories,
  onClose,
  onSaved,
}: CashBookCategoryModalProps) {
  const { showToast } = useToast();
  const [type, setType] = useState<CashBookType>("keluar");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<CashBookCategory | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = categories
    .filter((category) => category.type === type)
    .slice()
    .sort(
      (first, second) =>
        Number(second.isActive) - Number(first.isActive) ||
        first.name.localeCompare(second.name),
    );

  function resetForm() {
    setName("");
    setEditing(null);
    setError("");
  }

  function handleTypeChange(next: CashBookType) {
    setType(next);
    resetForm();
  }

  function startEdit(category: CashBookCategory) {
    setEditing(category);
    setName(category.name);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Nama kategori minimal 2 karakter.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveCashBookCategory({
        id: editing?.id,
        type,
        name: trimmed,
      });
      showToast(
        editing ? "Kategori diperbarui" : "Kategori ditambahkan",
        "success",
      );
      resetForm();
      onSaved();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Kategori gagal disimpan";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(category: CashBookCategory) {
    if (saving) return;

    setSaving(true);

    try {
      await setCashBookCategoryActive(category, !category.isActive);
      showToast(
        `Kategori ${category.name} ${category.isActive ? "dinonaktifkan" : "diaktifkan"}`,
        "success",
      );
      onSaved();
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Kategori gagal diubah",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Kategori Buku Kas"
      description="Kategori yang sudah dipakai entri tidak dihapus, cukup dinonaktifkan."
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Tabs
          tabs={TYPE_TABS}
          value={type}
          onChange={handleTypeChange}
          ariaLabel="Jenis kategori buku kas"
        />

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 rounded-control border border-line bg-canvas p-3"
        >
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
              <span className="text-meta font-semibold text-ink-muted">
                {editing ? `Ubah nama "${editing.name}"` : "Nama kategori baru"}
              </span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={
                  type === "masuk" ? "Contoh: Bunga bank" : "Contoh: Perbaikan"
                }
                maxLength={60}
              />
            </label>
            <Button
              variant="primary"
              type="submit"
              size="md"
              disabled={saving}
            >
              {saving
                ? "Menyimpan…"
                : editing
                  ? "Simpan Perubahan"
                  : "+ Tambah"}
            </Button>
            {editing ? (
              <Button
                variant="outline"
                size="md"
                onClick={resetForm}
                disabled={saving}
              >
                Batal
              </Button>
            ) : null}
          </div>
          {error ? (
            <p className="m-0 text-label font-semibold text-danger-ink">
              {error}
            </p>
          ) : null}
        </form>

        {rows.length === 0 ? (
          <div className="rounded-control border border-dashed border-line-strong bg-surface px-4 py-8 text-center text-body text-ink-muted">
            Belum ada kategori {type === "masuk" ? "pemasukan" : "pengeluaran"}.
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {rows.map((category) => (
              <li
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-surface px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-semibold text-ink">
                    {category.name}
                  </span>
                  <StatusBadge tone={category.isActive ? "success" : "neutral"}>
                    {category.isActive ? "Aktif" : "Nonaktif"}
                  </StatusBadge>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-[32px] px-2.5 text-meta"
                    onClick={() => startEdit(category)}
                    disabled={saving}
                  >
                    Edit
                  </Button>
                  <Button
                    variant={category.isActive ? "dangerOutline" : "outline"}
                    size="sm"
                    className="h-[32px] px-2.5 text-meta"
                    onClick={() => handleToggle(category)}
                    disabled={saving}
                  >
                    {category.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
