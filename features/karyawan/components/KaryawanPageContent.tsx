"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
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
import { setEmployeeAccountActiveAction } from "@/features/karyawan/actions";
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
      const result = await setEmployeeAccountActiveAction(row.id, isActive);

      if (!result.ok) throw new Error(result.error);

      setEmployeeActive(row.id, isActive);
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

  return (
    <KaryawanBody
      database={database}
      employee={employee}
      filters={filters}
      onFiltersChange={(patch) =>
        setFilters((current) => ({ ...current, ...patch }))
      }
      canManage={permissions.canManageEmployees}
      onCreate={openCreate}
      onEdit={openEdit}
      onActivate={(row) => applyActive(row, true)}
      onDeactivate={setDeactivateTarget}
      formOpen={formOpen}
      editing={editing}
      onCloseForm={() => setFormOpen(false)}
      deactivateTarget={deactivateTarget}
      onCancelDeactivate={() => setDeactivateTarget(null)}
      onConfirmDeactivate={() => {
        if (deactivateTarget) applyActive(deactivateTarget, false);
      }}
    />
  );
}

interface KaryawanBodyProps {
  database: AppDatabase;
  employee: Employee;
  filters: EmployeeFilters;
  onFiltersChange: (patch: Partial<EmployeeFilters>) => void;
  canManage: boolean;
  onCreate: () => void;
  onEdit: (row: EmployeeRow) => void;
  onActivate: (row: EmployeeRow) => void;
  onDeactivate: (row: EmployeeRow) => void;
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
  onCreate,
  onEdit,
  onActivate,
  onDeactivate,
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
          onFiltersChange={onFiltersChange}
          onEdit={onEdit}
          onToggleActive={(row) =>
            row.isActive ? onDeactivate(row) : onActivate(row)
          }
        />

        <RoleMatrixCard />
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
