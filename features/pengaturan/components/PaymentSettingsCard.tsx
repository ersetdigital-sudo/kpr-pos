"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  addBankAccount,
  deleteBankAccount,
  togglePaymentMethod,
  updateBankAccount,
} from "@/features/pengaturan/data/pengaturan-repository";
import type { BankAccount, PaymentSettings } from "@/lib/store/types";
import type { PaymentMethod } from "@/types";

const METHODS: readonly PaymentMethod[] = ["Cash", "QRIS", "Transfer"];

interface PaymentSettingsCardProps {
  payment: PaymentSettings;
}

export function PaymentSettingsCard({ payment }: PaymentSettingsCardProps) {
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleToggle(method: PaymentMethod, enabled: boolean) {
    if (saving) return;
    setSaving(true);

    try {
      await togglePaymentMethod(method, enabled);
      showToast(
        `Metode ${method} ${enabled ? "diaktifkan" : "dinonaktifkan"}`,
        "success",
      );
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Metode gagal diubah",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setBankName("");
    setAccountNumber("");
    setAccountHolder("");
    setError("");
    setFormOpen(true);
  }

  function openEdit(account: BankAccount) {
    setEditing(account);
    setBankName(account.bankName);
    setAccountNumber(account.accountNumber);
    setAccountHolder(account.accountHolder);
    setError("");
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);

    try {
      const input = { bankName, accountNumber, accountHolder };

      if (editing) {
        await updateBankAccount(editing.id, input);
        showToast(`Rekening ${bankName.trim()} diperbarui`, "success");
      } else {
        await addBankAccount(input);
        showToast(`Rekening ${bankName.trim()} ditambahkan`, "success");
      }
      setFormOpen(false);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Rekening gagal disimpan";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || saving) return;

    setSaving(true);

    try {
      await deleteBankAccount(deleteTarget.id);
      showToast(`Rekening ${deleteTarget.bankName} dihapus`, "success");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Rekening gagal dihapus",
        "error",
      );
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <Card className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="m-0 text-card-title font-bold text-ink">
            Metode Pembayaran
          </h2>
          <p className="mt-0.5 mb-0 text-label text-ink-muted">
            Metode nonaktif tidak muncul di Kasir.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {METHODS.map((method) => {
            const enabled = payment.enabledMethods.includes(method);

            return (
              <label
                key={method}
                className="flex h-10 cursor-pointer items-center gap-2 rounded-control border border-line-strong px-3 text-label font-semibold text-ink"
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={saving}
                  onChange={(event) =>
                    handleToggle(method, event.target.checked)
                  }
                  className="h-4 w-4 accent-brand"
                />
                {method}
              </label>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-label font-semibold text-ink-soft">
              Rekening transfer
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={openCreate}
              disabled={saving}
            >
              + Tambah rekening
            </Button>
          </div>

          {payment.bankAccounts.length === 0 ? (
            <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-6 text-center text-body text-ink-muted">
              Belum ada rekening. Tambahkan satu agar Transfer bisa dipakai.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-line-faint">
              {payment.bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-body">
                      <span className="font-semibold text-ink">
                        {account.bankName}
                      </span>
                      <StatusBadge tone="neutral">
                        {account.accountNumber}
                      </StatusBadge>
                    </div>
                    <div className="mt-0.5 text-meta text-ink-muted">
                      a.n. {account.accountHolder}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-[30px] px-2.5 text-meta"
                      onClick={() => openEdit(account)}
                      disabled={saving}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="dangerOutline"
                      size="sm"
                      className="h-[30px] px-2.5 text-meta"
                      onClick={() => setDeleteTarget(account)}
                      disabled={saving}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Rekening" : "Tambah Rekening"}
        description="Rekening ini muncul sebagai pilihan saat pembayaran Transfer."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="bank-form"
              disabled={saving}
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </>
        }
      >
        <form
          id="bank-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
        >
          <Field label="Nama bank" labelSize="sm">
            <Input
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              placeholder="Bank BCA"
              autoFocus
            />
          </Field>
          <Field label="Nomor rekening" labelSize="sm">
            <Input
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              placeholder="1234567890"
              inputMode="numeric"
            />
          </Field>
          <Field label="Atas nama" labelSize="sm">
            <Input
              value={accountHolder}
              onChange={(event) => setAccountHolder(event.target.value)}
              placeholder="CV. Karya Putra Ragil"
            />
          </Field>
          {error ? (
            <p className="m-0 text-label font-semibold text-danger-ink">
              {error}
            </p>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus rekening?"
        description={
          deleteTarget
            ? `Rekening ${deleteTarget.bankName} (${deleteTarget.accountNumber}) akan dihapus dari pilihan Transfer.`
            : ""
        }
        confirmLabel="Ya, hapus"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
