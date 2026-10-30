"use client";

import { ROLES } from "@/constants/roles";
import { appendActivity, createId } from "@/lib/store/activity";
import {
  updateDatabase,
  useHydratedDatabase,
} from "@/lib/store/store";
import type { AppDatabase, Employee } from "@/lib/store/types";
import type { EmployeeFormInput } from "@/features/karyawan/types";

export function useKaryawanData(): AppDatabase | null {
  return useHydratedDatabase();
}

export function buildInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) return "?";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function validateInput(database: AppDatabase, input: EmployeeFormInput): void {
  const name = input.name.trim();

  if (name.length < 2) throw new Error("Nama karyawan minimal 2 karakter");

  const digits = normalizePhone(input.phone);
  if (digits.replace(/\D/g, "").length < 8) {
    throw new Error("Nomor HP minimal 8 digit");
  }

  if (!input.branchId) throw new Error("Pilih cabang karyawan");
  if (!database.branches.some((branch) => branch.id === input.branchId)) {
    throw new Error("Cabang tidak ditemukan");
  }
}

export function createEmployee(input: EmployeeFormInput): void {
  updateDatabase((database) => {
    validateInput(database, input);

    const name = input.name.trim();
    const employee: Employee = {
      id: createId("emp"),
      name,
      phone: input.phone.trim(),
      initials: buildInitials(name),
      role: input.role,
      branchId: input.branchId,
      isActive: true,
    };

    return appendActivity(
      { ...database, employees: [...database.employees, employee] },
      {
        action: "Membuat",
        detail: `Karyawan ${name} (${input.role}) ditambahkan`,
      },
    );
  });
}

export function updateEmployee(
  employeeId: string,
  input: EmployeeFormInput,
): void {
  updateDatabase((database) => {
    validateInput(database, input);

    const target = database.employees.find(
      (employee) => employee.id === employeeId,
    );

    if (!target) throw new Error("Karyawan tidak ditemukan");

    const name = input.name.trim();

    return appendActivity(
      {
        ...database,
        employees: database.employees.map((employee) =>
          employee.id === employeeId
            ? {
                ...employee,
                name,
                phone: input.phone.trim(),
                initials: buildInitials(name),
                role: input.role,
                branchId: input.branchId,
              }
            : employee,
        ),
      },
      {
        action: "Mengubah",
        detail: `Data karyawan ${target.name} diperbarui`,
      },
    );
  });
}

export function setEmployeeActive(employeeId: string, isActive: boolean): void {
  updateDatabase((database) => {
    const target = database.employees.find(
      (employee) => employee.id === employeeId,
    );

    if (!target) throw new Error("Karyawan tidak ditemukan");
    if (!isActive && target.id === database.session.currentEmployeeId) {
      throw new Error("Tidak bisa menonaktifkan akun yang sedang dipakai");
    }

    if (!isActive && target.role === ROLES.OWNER) {
      const activeOwners = database.employees.filter(
        (employee) => employee.role === ROLES.OWNER && employee.isActive,
      );

      if (activeOwners.length <= 1) {
        throw new Error("Minimal harus ada satu Owner aktif");
      }
    }

    return appendActivity(
      {
        ...database,
        employees: database.employees.map((employee) =>
          employee.id === employeeId ? { ...employee, isActive } : employee,
        ),
      },
      {
        action: "Mengubah",
        detail: `Karyawan ${target.name} ${isActive ? "diaktifkan" : "dinonaktifkan"}`,
      },
    );
  });
}
