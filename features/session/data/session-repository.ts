"use client";

import { ROLES } from "@/constants/roles";
import { ROLE_PERMISSIONS, type RolePermissions } from "@/config/permissions";
import { useDatabase, updateDatabase } from "@/lib/store/store";
import type { AppDatabase, Branch, Employee } from "@/lib/store/types";

export interface SessionState {
  employee: Employee;
  branch: Branch;
  employees: Employee[];
  branches: Branch[];
  isOwner: boolean;
}

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
  const database = useDatabase();
  return selectSession(database);
}

export function usePermissions(): RolePermissions {
  const { employee } = useSession();
  return ROLE_PERMISSIONS[employee.role];
}

export function setActiveEmployee(employeeId: string): void {
  updateDatabase((database) => {
    const employee = database.employees.find(
      (item) => item.id === employeeId && item.isActive,
    );

    if (!employee) return database;

    const preferredBranchId =
      employee.role === ROLES.OWNER
        ? database.session.activeBranchId
        : employee.branchId;
    const branch =
      database.branches.find(
        (item) => item.id === preferredBranchId && item.isActive,
      ) ??
      database.branches.find(
        (item) => item.id === employee.branchId && item.isActive,
      ) ??
      database.branches.find((item) => item.isActive);

    return {
      ...database,
      session: {
        currentEmployeeId: employee.id,
        activeBranchId: branch?.id ?? database.session.activeBranchId,
      },
    };
  });
}

export function setActiveBranch(branchId: string): void {
  updateDatabase((database) => {
    const employee = database.employees.find(
      (item) => item.id === database.session.currentEmployeeId,
    );

    // Hanya Owner yang boleh berpindah cabang secara manual.
    if (!employee || employee.role !== ROLES.OWNER) return database;

    const branch = database.branches.find(
      (item) => item.id === branchId && item.isActive,
    );

    if (!branch) return database;

    return {
      ...database,
      session: {
        ...database.session,
        activeBranchId: branch.id,
      },
    };
  });
}
