"use client";

import { updateDatabase } from "@/lib/store/store";
import type {
  ActivityAction,
  AppDatabase,
  Employee,
} from "@/lib/store/types";

interface ActivityInput {
  action: ActivityAction;
  detail: string;
}

function resolveActor(database: AppDatabase): Employee | undefined {
  return database.employees.find(
    (employee) => employee.id === database.session.currentEmployeeId,
  );
}

export function createId(prefix: string): string {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${randomPart}`;
}

/** Menambahkan log ke database tanpa menyimpan; dipakai di dalam mutasi lain. */
export function appendActivity(
  database: AppDatabase,
  input: ActivityInput,
): AppDatabase {
  const actor = resolveActor(database);

  if (!actor) return database;

  const entry = {
    id: createId("log"),
    at: new Date().toISOString(),
    userId: actor.id,
    userName: actor.name,
    role: actor.role,
    branchId: database.session.activeBranchId,
    action: input.action,
    detail: input.detail,
  };

  return {
    ...database,
    activityLogs: [entry, ...database.activityLogs].slice(0, 200),
  };
}

/** Mencatat aksi yang tidak mengubah entitas lain, misalnya batal keranjang. */
export function recordActivity(input: ActivityInput): void {
  updateDatabase((database) => appendActivity(database, input));
}
