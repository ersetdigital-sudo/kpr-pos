import type { Role } from "@/constants/roles";

export interface EmployeeRow {
  id: string;
  name: string;
  phone: string;
  initials: string;
  role: Role;
  branchId: string;
  branchName: string;
  isActive: boolean;
}

export interface EmployeeFilters {
  search: string;
  role: Role | "all";
  branchId: string | "all";
  status: "all" | "active" | "inactive";
}

export interface EmployeeFormInput {
  name: string;
  phone: string;
  role: Role;
  branchId: string;
}

export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  rolesUsed: number;
}

export interface RoleAccessRow {
  menu: string;
  section: string;
  access: Record<Role, boolean>;
}
