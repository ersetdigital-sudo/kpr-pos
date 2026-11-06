"use client";

import { recordActivity } from "@/lib/store/activity";
import { getDatabase, useHydratedDatabase } from "@/lib/store/store";
import type { AppDatabase } from "@/lib/store/types";
import type { BranchFormInput } from "@/features/cabang/types";
import {
  createBranchAction,
  setBranchActiveAction,
  updateBranchAction,
} from "@/features/cabang/cloud-actions";
import {
  syncAppFromCloud,
  trackCloudWrite,
} from "@/features/sync/data/app-sync";
import type { CloudActionResult } from "@/lib/cloud/result";

export function useCabangData(): AppDatabase | null {
  return useHydratedDatabase();
}

function assertOk(result: CloudActionResult): void {
  if (!result.ok) throw new Error(result.error);
}

async function refreshAfterWrite(): Promise<void> {
  try {
    await syncAppFromCloud({ force: true });
  } catch (error) {
    console.error("Sinkronisasi setelah simpan cabang gagal:", error);
  }
}

function validateFields(input: BranchFormInput): void {
  if (input.name.trim().length < 2) {
    throw new Error("Nama cabang minimal 2 karakter");
  }
  if (input.address.trim().length < 5) {
    throw new Error("Alamat cabang minimal 5 karakter");
  }
  if (input.phone.replace(/\D/g, "").length < 8) {
    throw new Error("No. telp minimal 8 digit");
  }
}

function assertNameAvailable(
  database: AppDatabase,
  name: string,
  exceptId?: string,
): void {
  const duplicate = database.branches.some(
    (branch) =>
      branch.id !== exceptId &&
      branch.name.toLowerCase() === name.trim().toLowerCase(),
  );

  if (duplicate) throw new Error("Nama cabang sudah dipakai");
}

export async function createBranch(input: BranchFormInput): Promise<void> {
  const database = getDatabase();
  validateFields(input);
  assertNameAvailable(database, input.name);

  const result = await trackCloudWrite(() => createBranchAction(input));
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Membuat",
    detail: `Cabang ${input.name.trim()} ditambahkan`,
  });
}

export async function updateBranch(
  branchId: string,
  input: BranchFormInput,
): Promise<void> {
  const database = getDatabase();
  const target = database.branches.find((branch) => branch.id === branchId);

  if (!target) throw new Error("Cabang tidak ditemukan");

  validateFields(input);
  assertNameAvailable(database, input.name, branchId);

  const result = await trackCloudWrite(() =>
    updateBranchAction(branchId, input),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: `Data cabang ${target.name} diperbarui`,
  });
}

export async function setBranchActive(
  branchId: string,
  isActive: boolean,
): Promise<void> {
  const database = getDatabase();
  const target = database.branches.find((branch) => branch.id === branchId);

  if (!target) throw new Error("Cabang tidak ditemukan");

  if (!isActive) {
    const activeBranches = database.branches.filter(
      (branch) => branch.isActive,
    );

    if (activeBranches.length <= 1) {
      throw new Error("Minimal harus ada satu cabang aktif");
    }

    if (branchId === database.session.activeBranchId) {
      throw new Error(
        "Pindah ke cabang lain dulu sebelum menonaktifkan cabang ini",
      );
    }
  }

  const result = await trackCloudWrite(() =>
    setBranchActiveAction(branchId, isActive),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: `Cabang ${target.name} ${isActive ? "diaktifkan" : "dinonaktifkan"}`,
  });
}
