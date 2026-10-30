import { ALL_ROLES, type Role } from "@/constants/roles";
import { NAV_SECTIONS } from "@/config/navigation";
import type { AppDatabase } from "@/lib/store/types";
import type {
  EmployeeFilters,
  EmployeeRow,
  EmployeeStats,
  RoleAccessRow,
} from "@/features/karyawan/types";

export function buildEmployeeRows(
  database: AppDatabase,
  filters: EmployeeFilters,
): EmployeeRow[] {
  const branchById = new Map(
    database.branches.map((branch) => [branch.id, branch]),
  );
  const search = filters.search.trim().toLowerCase();

  return database.employees
    .filter((employee) => {
      if (filters.role !== "all" && employee.role !== filters.role) {
        return false;
      }
      if (
        filters.branchId !== "all" &&
        employee.branchId !== filters.branchId
      ) {
        return false;
      }
      if (filters.status === "active" && !employee.isActive) return false;
      if (filters.status === "inactive" && employee.isActive) return false;

      if (!search) return true;

      return (
        employee.name.toLowerCase().includes(search) ||
        employee.phone.toLowerCase().includes(search) ||
        employee.role.toLowerCase().includes(search)
      );
    })
    .map((employee) => ({
      id: employee.id,
      name: employee.name,
      phone: employee.phone,
      initials: employee.initials,
      role: employee.role,
      branchId: employee.branchId,
      branchName: branchById.get(employee.branchId)?.name ?? "-",
      isActive: employee.isActive,
    }))
    .sort((first, second) => {
      if (first.isActive !== second.isActive) return first.isActive ? -1 : 1;
      return first.name.localeCompare(second.name);
    });
}

export function calculateEmployeeStats(database: AppDatabase): EmployeeStats {
  const active = database.employees.filter((employee) => employee.isActive);
  const roles = new Set(active.map((employee) => employee.role));

  return {
    total: database.employees.length,
    active: active.length,
    inactive: database.employees.length - active.length,
    rolesUsed: roles.size,
  };
}

/** Matriks menu yang bisa dibuka per role, diambil dari config navigasi. */
export function buildRoleMatrix(): RoleAccessRow[] {
  return NAV_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      menu: item.label,
      section: section.label,
      access: ALL_ROLES.reduce(
        (result, role) => ({
          ...result,
          [role]: item.roles.includes(role),
        }),
        {} as Record<Role, boolean>,
      ),
    })),
  );
}
