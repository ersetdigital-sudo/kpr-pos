"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/features/produk/data/produk-repository";
import type { CategoryUsage } from "@/features/produk/types";

interface CategoryPanelProps {
  usages: readonly CategoryUsage[];
  canManage: boolean;
}

export function CategoryPanel({ usages, canManage }: CategoryPanelProps) {
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryUsage | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryUsage | null>(null);

  function openCreate() {
    setEditing(null);
    setName("");
    setError("");
    setFormOpen(true);
  }

  function openEdit(usage: CategoryUsage) {
    setEditing(usage);
    setName(usage.category.name);
    setError("");
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!name.trim()) {
      setError("Nama kategori wajib diisi");
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        await updateCategory(editing.category.id, name);
        showToast("Kategori diperbarui", "success");
      } else {
        await createCategory(name);
        showToast("Kategori ditambahkan", "success");
      }
      setFormOpen(false);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Kategori gagal disimpan";
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
      await deleteCategory(deleteTarget.category.id);
      showToast(`Kategori ${deleteTarget.category.name} dihapus`, "success");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Kategori gagal dihapus",
        "error",
      );
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  }

  const columns: readonly DataTableColumn<CategoryUsage>[] = [
    {
      id: "name",
      header: "Kategori",
      cell: (usage) => (
        <span className="font-semibold text-ink">{usage.category.name}</span>
      ),
    },
    {
      id: "products",
      header: "Dipakai Produk",
      cell: (usage) =>
        usage.productCount > 0 ? (
          <span>{usage.productCount} produk</span>
        ) : (
          <span className="text-ink-muted">Belum dipakai</span>
        ),
    },
    ...(canManage
      ? [
          {
            id: "action",
            header: <span className="sr-only">Aksi</span>,
            align: "right" as const,
            cell: (usage: CategoryUsage) => (
              <div className="flex justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[32px] px-2.5 text-meta"
                  onClick={() => openEdit(usage)}
                >
                  Edit
                </Button>
                <Button
                  variant="dangerOutline"
                  size="sm"
                  className="h-[32px] px-2.5 text-meta"
                  title={
                    usage.productCount > 0
                      ? "Kategori masih dipakai produk"
                      : undefined
                  }
                  onClick={() => {
                    if (usage.productCount > 0) {
                      showToast(
                        `Kategori ${usage.category.name} masih dipakai ${usage.productCount} produk`,
                        "error",
                      );
                      return;
                    }
                    setDeleteTarget(usage);
                  }}
                >
                  Hapus
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Card className="flex flex-col gap-3.5 p-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="m-0 text-card-title font-bold text-ink">
              Kategori Produk
            </h2>
            <p className="mt-0.5 mb-0 text-label text-ink-muted">
              Kategori yang masih dipakai produk tidak bisa dihapus.
            </p>
          </div>
          {canManage ? (
            <Button variant="primary" size="md" onClick={openCreate}>
              + Tambah Kategori
            </Button>
          ) : null}
        </div>

        {usages.length === 0 ? (
          <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
            Belum ada kategori.
          </div>
        ) : (
          <DataTable
            ariaLabel="Daftar kategori"
            columns={columns}
            rows={usages}
            rowKey={(usage) => usage.category.id}
            minWidth={420}
            density="roomy"
            headerTone="soft"
          />
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Kategori" : "Tambah Kategori"}
        description="Nama kategori dipakai sebagai filter di Kasir dan Produk."
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
              form="category-form"
              disabled={saving}
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </>
        }
      >
        <form
          id="category-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
        >
          <Field label="Nama kategori" labelSize="sm">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Aksesoris"
              autoFocus
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
        title="Hapus kategori?"
        description={
          deleteTarget
            ? `Kategori "${deleteTarget.category.name}" akan dihapus permanen.`
            : ""
        }
        confirmLabel="Hapus kategori"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
