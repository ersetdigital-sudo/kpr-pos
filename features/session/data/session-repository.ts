"use client";

import { ROLES } from "@/constants/roles";
import { ROLE_PERMISSIONS, type RolePermissions } from "@/config/permissions";
import {
  useSessionActions,
  useSessionContext,
} from "@/features/session/data/session-context";
import type { SessionState } from "@/features/session/types";
import type { AppDatabase } from "@/lib/store/types";

export type { SessionState } from "@/features/session/types";

export function selectSession(database: AppDatabase): SessionState {
  const employees = database.employees.filter((employee) => employee.isActive);
  const branches = database.branches.filter((branch) => branch.isActive);
  const employee =
    employees.find(
      (item) => item.id === database.session.currentEmployeeId,
    ) ?? employees[0];
  const branch =
    branches.find((item) => item.id === database.session.activeBranchId) ??
    (employee
      ? branches.find((item) => item.id === employee.branchId)
      : undefined) ??
    branches[0];

  if (!employee || !branch) {
    throw new Error("Data karyawan atau cabang belum tersedia");
  }

  return {
    employee,
    branch,
    employees,
    branches,
    isOwner: employee.role === ROLES.OWNER,
  };
}

export function useSession(): SessionState {
  const session = useSessionContext();

  if (!session) {
    throw new Error("useSession harus dipakai di dalam AuthSessionProvider");
  }

  return session;
}

export function usePermissions(): RolePermissions {
  const { employee } = useSession();
  return ROLE_PERMISSIONS[employee.role];
}

/** Ganti cabang aktif; hanya Owner yang boleh. */
export function useSetActiveBranch(): (branchId: string) => void {
  return useSessionActions().setBranch;
}
