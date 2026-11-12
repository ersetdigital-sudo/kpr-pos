"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Drawer } from "@/components/ui/Drawer";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { saveCashBookEntry } from "@/features/buku-kas/data/repository";
import type {
  CashBookBranch,
  CashBookCategory,
  CashBookEntry,
  CashBookType,
} from "@/features/buku-kas/types";

interface CashBookEntryDrawerProps {
  type: CashBookType;
  entry: CashBookEntry | null;
  categories: readonly CashBookCategory[];
  branches: readonly CashBookBranch[];
  defaultBranchId: string;
  canChooseBranch: boolean;
  /** Tanggal hari ini (YYYY-MM-DD), dihitung setelah store ter-hydrate. */
  today: string;
  onClose: () => void;
  onSaved: () => void;
}

export function CashBookEntryDrawer({
  type,
  entry,
  categories,
  branches,
  defaultBranchId,
  canChooseBranch,
  today,
  onClose,
  onSaved,
}: CashBookEntryDrawerProps) {
  const { showToast } = useToast();
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? "");
  const [amount, setAmount] = useState(entry?.amount ?? 0);
  const [description, setDescription] = useState(entry?.description ?? "");
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? today);
  const [branchId, setBranchId] = useState(entry?.branchId ?? defaultBranchId);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = entry !== null;
  const typeLabel = type === "masuk" ? "Pemasukan" : "Pengeluaran";
  const availableCategories = categories.filter(
    (category) =>
      category.type === type &&
      (category.isActive || category.id === entry?.categoryId),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!categoryId) {
      setError("Pilih kategori terlebih dahulu.");
      return;
    }
    if (amount <= 0) {
      setError("Nominal harus lebih dari 0.");
      return;
    }
    if (description.trim().length < 3) {
      setError("Keterangan minimal 3 karakter.");
      return;
    }
    if (!entryDate) {
      setError("Tanggal entri wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveCashBookEntry({
        id: entry?.id,
        branchId,
        type,
        categoryId,
        amount,
        description,
        entryDate,
      });
      showToast(
        `${typeLabel} ${isEditing ? "diperbarui" : "disimpan"}`,
        "success",
      );
      onSaved();
      onClose();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Entri kas gagal disimpan";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={`${isEditing ? "Edit" : "Tambah"} ${typeLabel}`}
      description={
        type === "masuk"
          ? "Pemasukan di luar penjualan, misalnya tambahan modal atau saldo awal."
          : "Pengeluaran kas operasional cabang."
      }
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="cash-book-entry-form"
            disabled={saving}
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </>
      }
    >
      <form
        id="cash-book-entry-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-3.5"
      >
        <Field label="Tanggal" labelSize="sm">
          <Input
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
            required
          />
        </Field>

        <Field label="Cabang" labelSize="sm">
          {canChooseBranch ? (
            <Select
              aria-label="Cabang entri kas"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={branches.find((item) => item.id === branchId)?.name ?? ""}
              readOnly
              disabled
            />
          )}
        </Field>

        <Field label="Kategori" labelSize="sm">
          <Select
            aria-label="Kategori entri kas"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Pilih kategori</option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? "" : " (nonaktif)"}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Nominal" labelSize="sm">
          <CurrencyInput
            aria-label="Nominal entri kas"
            value={amount}
            onValueChange={setAmount}
            placeholder="0"
          />
        </Field>

        <Field label="Keterangan" labelSize="sm">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={
              type === "masuk"
                ? "Contoh: Setoran modal awal bulan"
                : "Contoh: Bayar listrik cabang"
            }
            rows={2}
            maxLength={200}
            className="text-label"
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
