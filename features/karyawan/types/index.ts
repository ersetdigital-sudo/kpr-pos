import type { Role } from "@/constants/roles";
import type { Branch, Employee } from "@/lib/store/types";

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

export interface InviteEmployeeInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
  branch: Branch;
}

export interface EmployeeAccountInput {
  name: string;
  phone: string;
  role: Role;
  branch: Branch;
}

export type InviteEmployeeResult =
  | { ok: true; employee: Employee }
  | { ok: false; error: string };

export type EmployeeAccountResult =
  | { ok: true }
  | { ok: false; error: string };

export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  rolesUsed: number;
}

