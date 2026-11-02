"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { BranchFormDrawer } from "@/features/cabang/components/BranchFormDrawer";
import { BranchStatsCards } from "@/features/cabang/components/BranchStatsCards";
import { BranchTable } from "@/features/cabang/components/BranchTable";
import {
  buildBranchRows,
  calculateBranchSummary,
} from "@/features/cabang/data/cabang-calculations";
import {
  setBranchActive,
  useCabangData,
} from "@/features/cabang/data/cabang-repository";
import type { BranchFilters, BranchRow } from "@/features/cabang/types";
import {
  usePermissions,
  useSession,
} from "@/features/session/data/session-repository";
import type { AppDatabase } from "@/lib/store/types";

export function CabangPageContent() {
  const database = useCabangData();
  const { branch } = useSession();
  const permissions = usePermissions();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<BranchFilters>({ status: "all" });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BranchRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<BranchRow | null>(
    null,
  );
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (!database) {
    return (
      <>
        <PageHeader title="Cabang" subtitle="Memuat data cabang…" />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-body text-ink-muted">
            Menyiapkan data…
          </div>
        </div>
      </>
    );
  }

  async function applyActive(row: BranchRow, isActive: boolean) {
    if (togglingId) return;

    setTogglingId(row.id);

    try {
      await setBranchActive(row.id, isActive);
      showToast(
        isActive
          ? `Cabang ${row.name} diaktifkan`
          : `Cabang ${row.name} dinonaktifkan`,
        "success",
      );
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Status gagal diubah",
        "error",
      );
    } finally {
      setTogglingId(null);
      setDeactivateTarget(null);
    }
  }

  return (
    <CabangBody
      database={database}
      filters={filters}
      onFiltersChange={(patch) =>
        setFilters((current) => ({ ...current, ...patch }))
      }
      canManage={permissions.canManageBranches}
      activeBranchId={branch.id}
      onCreate={() => {
        setEditing(null);
        setFormOpen(true);
      }}
      onEdit={(row) => {
        setEditing(row);
        setFormOpen(true);
      }}
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

interface CabangBodyProps {
  database: AppDatabase;
  filters: BranchFilters;
  onFiltersChange: (patch: Partial<BranchFilters>) => void;
  canManage: boolean;
  activeBranchId: string;
  onCreate: () => void;
  onEdit: (row: BranchRow) => void;
  onActivate: (row: BranchRow) => void;
  onDeactivate: (row: BranchRow) => void;
  formOpen: boolean;
  editing: BranchRow | null;
  onCloseForm: () => void;
  deactivateTarget: BranchRow | null;
  onCancelDeactivate: () => void;
  onConfirmDeactivate: () => void;
}

function CabangBody({
  database,
  filters,
  onFiltersChange,
  canManage,
  activeBranchId,
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
}: CabangBodyProps) {
  const today = new Date();
  const rows = buildBranchRows(database, filters, today);
  const summary = calculateBranchSummary(database, today);

  return (
    <>
      <PageHeader
        title="Cabang"
        subtitle={`${summary.activeBranches} cabang aktif · ${summary.totalEmployees} karyawan`}
        actions={
          canManage ? (
            <Button variant="primary" size="md" onClick={onCreate}>
              + Tambah Cabang
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-[18px] p-4 sm:p-5 lg:px-7 lg:py-5">
        <BranchStatsCards summary={summary} />

        <BranchTable
          rows={rows}
          filters={filters}
          canManage={canManage}
          activeBranchId={activeBranchId}
          onFiltersChange={onFiltersChange}
          onEdit={onEdit}
          onToggleActive={(row) =>
            row.isActive ? onDeactivate(row) : onActivate(row)
          }
        />
      </div>

      <BranchFormDrawer
        key={editing?.id ?? "new"}
        open={formOpen}
        branch={editing}
        onClose={onCloseForm}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Nonaktifkan cabang?"
        description={
          deactivateTarget
            ? `Cabang ${deactivateTarget.name} tidak bisa dipilih lagi untuk transaksi baru, tetapi riwayat stok, transaksi, dan absensinya tetap tersimpan.`
            : ""
        }
        confirmLabel="Ya, nonaktifkan"
        onClose={onCancelDeactivate}
        onConfirm={onConfirmDeactivate}
      />
    </>
  );
}
