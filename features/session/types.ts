import type { Branch, Employee } from "@/lib/store/types";

/** Bentuk sesi yang dipakai seluruh komponen UI. */
export interface SessionState {
  employee: Employee;
  branch: Branch;
  employees: Employee[];
  branches: Branch[];
  isOwner: boolean;
}
