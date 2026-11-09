"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { ALL_ROLES, ROLES, type Role } from "@/constants/roles";
import {
  PERMISSION_ROWS,
  ROLE_PERMISSIONS,
  type RolePermissions,
} from "@/config/permissions";
import {
  fetchRolePermissionsAction,
  saveRolePermissionsAction,
} from "@/features/karyawan/actions";

interface RoleMatrixCardProps {
  canEdit: boolean;
}

export function RoleMatrixCard({ canEdit }: RoleMatrixCardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [matrix, setMatrix] =
    useState<Record<Role, RolePermissions>>(ROLE_PERMISSIONS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchRolePermissionsAction()
      .then((result) => {
        if (active && result.ok) setMatrix(result.matrix);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  function toggle(role: Role, key: keyof RolePermissions) {
    if (!canEdit || role === ROLES.OWNER) return;

    setMatrix((current) => ({
      ...current,
      [role]: {
        ...current[role],
        [key]: !current[role][key],
      },
    }));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);

    try {
      const result = await saveRolePermissionsAction(matrix);
      if (!result.ok) throw new Error(result.error);
      showToast("Hak akses role disimpan", "success");
      router.refresh();
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Hak akses gagal disimpan",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3.5 p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="m-0 text-card-title font-bold text-ink">
            Hak Akses per Role
          </h2>
          <p className="mt-0.5 mb-0 text-label text-ink-muted">
            {canEdit
              ? "Centang izin tiap role. Owner selalu memegang semua akses."
              : "Hanya Owner yang bisa mengubah hak akses role."}
          </p>
        </div>
        {canEdit ? (
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Menyimpan…" : "Simpan Hak Akses"}
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table
          aria-label="Matriks hak akses role"
          className="w-full border-collapse text-body"
          style={{ minWidth: 980 }}
        >
          <thead>
            <tr className="bg-line-subtle text-left text-meta text-ink-muted">
              <th className="px-2 py-[10px] font-semibold">Izin</th>
              {ALL_ROLES.map((role) => (
                <th
                  key={role}
                  scope="col"
                  className="px-2 py-[10px] text-center font-semibold"
                >
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_ROWS.map((row) => (
              <tr key={row.key} className="border-t border-line-faint">
                <th
                  scope="row"
                  className="px-2 py-2.5 text-left font-semibold text-ink"
                >
                  {row.label}
                </th>
                {ALL_ROLES.map((role) => (
                  <td key={role} className="px-2 py-2.5 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${row.label} untuk ${role}`}
                      checked={matrix[role][row.key]}
                      disabled={
                        !canEdit || role === ROLES.OWNER || saving
                      }
                      onChange={() => toggle(role, row.key)}
                      className="h-4 w-4 accent-brand"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
