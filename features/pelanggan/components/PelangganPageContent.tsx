"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { CustomerFormModal } from "@/features/pelanggan/components/CustomerFormModal";
import { CustomerList } from "@/features/pelanggan/components/CustomerList";
import {
  buildCustomerRows,
  saveCustomer,
  usePelangganData,
} from "@/features/pelanggan/data/pelanggan-repository";
import { usePermissions } from "@/features/session/data/session-repository";
import type { CustomerRow } from "@/features/pelanggan/types";

export function PelangganPageContent() {
  const database = usePelangganData();
  const permissions = usePermissions();
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [saving, setSaving] = useState(false);

  const canManageTempo = permissions.canSetCustomerTempo;

  async function handleSubmit(input: {
    id?: string;
    name: string;
    phone: string;
    address: string;
    npwp: string;
    allowTempo: boolean;
  }) {
    if (saving) return;
    setSaving(true);

    try {
      await saveCustomer(input);
      setFormOpen(false);
      setEditing(null);
      showToast("Data pelanggan disimpan", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Pelanggan gagal disimpan",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!database) {
    return (
      <>
        <PageHeader title="Pelanggan" subtitle="Memuat data pelanggan…" />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-body text-ink-muted">
            Menyiapkan data…
          </div>
        </div>
      </>
    );
  }

  const rows = buildCustomerRows(database);

  return (
    <>
      <PageHeader
        title="Pelanggan"
        subtitle="Data pelanggan, penanda boleh tempo, dan tagihan berjalan"
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        <CustomerList
          rows={rows}
          canManageTempo={canManageTempo}
          onAdd={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          onEdit={(row) => {
            setEditing(row);
            setFormOpen(true);
          }}
        />
      </div>

      {formOpen ? (
        <CustomerFormModal
          key={editing?.id ?? "new"}
          customer={editing}
          canSetTempo={canManageTempo}
          saving={saving}
          onClose={() => {
            if (saving) return;
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}
    </>
  );
}
