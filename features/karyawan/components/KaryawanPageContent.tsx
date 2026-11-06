"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { EmployeeFormDrawer } from "@/features/karyawan/components/EmployeeFormDrawer";
import { EmployeeStatsCards } from "@/features/karyawan/components/EmployeeStatsCards";
import { EmployeeTable } from "@/features/karyawan/components/EmployeeTable";
import { RoleMatrixCard } from "@/features/karyawan/components/RoleMatrixCard";
import {
  buildEmployeeRows,
  calculateEmployeeStats,
} from "@/features/karyawan/data/karyawan-calculations";
import {
  setEmployeeActive,
  useKaryawanData,
} from "@/features/karyawan/data/karyawan-repository";
import {
  deleteEmployeeAccountAction,
  setEmployeeAccountActiveAction,
} from "@/features/karyawan/actions";
import {
  syncAppFromCloud,
  trackCloudWrite,
} from "@/features/sync/data/app-sync";
import type {
  EmployeeFilters,
  EmployeeRow,
} from "@/features/karyawan/types";
import {
  usePermissions,
  useSession,
} from "@/features/session/data/session-repository";
import type { AppDatabase, Employee } from "@/lib/store/types";

export function KaryawanPageContent() {
  const database = useKaryawanData();
  const { employee } = useSession();
  const permissions = usePermissions();
  const { showToast } = useToast();
  const router = useRouter();
  const [filters, setFilters] = useState<EmployeeFilters>({
    search: "",
    role: "all",
    branchId: "all",
    status: "all",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<EmployeeRow | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!database) {
    return (
      <>
        <PageHeader title="Karyawan & Role" subtitle="Memuat data karyawan…" />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-body text-ink-muted">
            Menyiapkan data…
          </div>
        </div>
      </>
    );
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(row: EmployeeRow) {
    setEditing(row);
    setFormOpen(true);
  }

  async function applyActive(row: EmployeeRow, isActive: boolean) {
    try {
      const result = await trackCloudWrite(() =>
        setEmployeeAccountActiveAction(row.id, isActive),
      );

      if (!result.ok) throw new Error(result.error);

      setEmployeeActive(row.id, isActive);
      void syncAppFromCloud({ force: true }).catch(() => undefined);
      showToast(
        isActive
          ? `${row.name} diaktifkan`
          : `${row.name} dinonaktifkan, riwayatnya tetap tersimpan`,
        "success",
      );
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Status gagal diubah",
        "error",
      );
    } finally {
      setDeactivateTarget(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);

    try {
      const result = await trackCloudWrite(() =>
        deleteEmployeeAccountAction(deleteTarget.id),
      );
      if (!result.ok) throw new Error(result.error);
      showToast(`${deleteTarget.name} dihapus permanen`, "success");
      void syncAppFromCloud({ force: true }).catch(() => undefined);
      router.refresh();
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Karyawan gagal dihapus",
        "error",
      );
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <KaryawanBody
        database={database}
        employee={employee}
        filters={filters}
        onFiltersChange={(patch) =>
          setFilters((current) => ({ ...current, ...patch }))
        }
        canManage={permissions.canManageEmployees}
        canDelete={employee.role === "Owner"}
        canEditRoles={employee.role === "Owner"}
        onCreate={openCreate}
        onEdit={openEdit}
        onActivate={(row) => applyActive(row, true)}
        onDeactivate={setDeactivateTarget}
        onDelete={setDeleteTarget}
        formOpen={formOpen}
        editing={editing}
        onCloseForm={() => setFormOpen(false)}
        deactivateTarget={deactivateTarget}
        onCancelDeactivate={() => setDeactivateTarget(null)}
        onConfirmDeactivate={() => {
          if (deactivateTarget) applyActive(deactivateTarget, false);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus karyawan permanen?"
        description={
          deleteTarget
            ? `${deleteTarget.name} akan dihapus. Karyawan yang sudah punya riwayat transaksi/absensi tidak bisa dihapus dan harus dinonaktifkan.`
            : ""
        }
        confirmLabel="Ya, hapus permanen"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}

interface KaryawanBodyProps {
  database: AppDatabase;
  employee: Employee;
  filters: EmployeeFilters;
  onFiltersChange: (patch: Partial<EmployeeFilters>) => void;
  canManage: boolean;
  canDelete: boolean;
  canEditRoles: boolean;
  onCreate: () => void;
  onEdit: (row: EmployeeRow) => void;
  onActivate: (row: EmployeeRow) => void;
  onDeactivate: (row: EmployeeRow) => void;
  onDelete: (row: EmployeeRow) => void;
  formOpen: boolean;
  editing: EmployeeRow | null;
  onCloseForm: () => void;
  deactivateTarget: EmployeeRow | null;
  onCancelDeactivate: () => void;
  onConfirmDeactivate: () => void;
}

function KaryawanBody({
  database,
  employee,
  filters,
  onFiltersChange,
  canManage,
  canDelete,
  canEditRoles,
  onCreate,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
  formOpen,
  editing,
  onCloseForm,
  deactivateTarget,
  onCancelDeactivate,
  onConfirmDeactivate,
}: KaryawanBodyProps) {
  const rows = buildEmployeeRows(database, filters);
  const stats = calculateEmployeeStats(database);

  return (
    <>
      <PageHeader
        title="Karyawan & Role"
        subtitle={`${stats.active} karyawan aktif · ${stats.rolesUsed} role terpakai`}
        actions={
          canManage ? (
            <Button variant="primary" size="md" onClick={onCreate}>
              + Tambah Karyawan
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-[18px] p-4 sm:p-5 lg:px-7 lg:py-5">
        <EmployeeStatsCards stats={stats} />

        <EmployeeTable
          rows={rows}
          filters={filters}
          branches={database.branches}
          canManage={canManage}
          currentEmployeeId={employee.id}
          canDelete={canDelete}
          onFiltersChange={onFiltersChange}
          onEdit={onEdit}
          onToggleActive={(row) =>
            row.isActive ? onDeactivate(row) : onActivate(row)
          }
          onDelete={onDelete}
        />

        {canManage ? (
          <Card className="p-4">
            <p className="m-0 text-label text-ink-muted">
              <span className="font-semibold text-ink">
                Cara karyawan login:
              </span>{" "}
              klik <span className="font-semibold text-ink">+ Tambah Karyawan</span>,
              isi nama, email, dan password awal, lalu berikan email dan password
              tersebut ke karyawan. Karyawan masuk lewat halaman{" "}
              <span className="font-semibold text-ink">/login</span> dan bisa
              mengganti password sendiri dari menu akun di kanan atas.
              Karyawan nonaktif tidak bisa login.
            </p>
          </Card>
        ) : null}

        <RoleMatrixCard canEdit={canEditRoles} />
      </div>

      <EmployeeFormDrawer
        key={editing?.id ?? "new"}
        open={formOpen}
        employee={editing}
        branches={database.branches.filter((branch) => branch.isActive)}
        onClose={onCloseForm}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Nonaktifkan karyawan?"
        description={
          deactivateTarget
            ? `${deactivateTarget.name} tidak bisa login atau ditugaskan, tetapi seluruh riwayat transaksi serta absensinya tetap tersimpan.`
            : ""
        }
        confirmLabel="Ya, nonaktifkan"
        onClose={onCancelDeactivate}
        onConfirm={onConfirmDeactivate}
      />
    </>
  );
}
