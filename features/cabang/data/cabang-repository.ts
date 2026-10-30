"use client";

import { appendActivity, createId } from "@/lib/store/activity";
import {
  updateDatabase,
  useHydratedDatabase,
} from "@/lib/store/store";
import type { AppDatabase, Branch } from "@/lib/store/types";
import type { BranchFormInput } from "@/features/cabang/types";

export function useCabangData(): AppDatabase | null {
  return useHydratedDatabase();
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

export function createBranch(input: BranchFormInput): void {
  updateDatabase((database) => {
    validateFields(input);
    assertNameAvailable(database, input.name);

    const name = input.name.trim();
    const branch: Branch = {
      id: createId("br"),
      name,
      address: input.address.trim(),
      phone: input.phone.trim(),
      isActive: true,
    };

    // Cabang baru mulai dengan stok 0 untuk semua produk.
    const stocks = database.products.map((product) => ({
      branchId: branch.id,
      productId: product.id,
      quantity: 0,
      minStock: 5,
    }));

    return appendActivity(
      {
        ...database,
        branches: [...database.branches, branch],
        stocks: [...database.stocks, ...stocks],
      },
      { action: "Membuat", detail: `Cabang ${name} ditambahkan` },
    );
  });
}

export function updateBranch(
  branchId: string,
  input: BranchFormInput,
): void {
  updateDatabase((database) => {
    const target = database.branches.find((branch) => branch.id === branchId);

    if (!target) throw new Error("Cabang tidak ditemukan");

    validateFields(input);
    assertNameAvailable(database, input.name, branchId);

    return appendActivity(
      {
        ...database,
        branches: database.branches.map((branch) =>
          branch.id === branchId
            ? {
                ...branch,
                name: input.name.trim(),
                address: input.address.trim(),
                phone: input.phone.trim(),
              }
            : branch,
        ),
      },
      { action: "Mengubah", detail: `Data cabang ${target.name} diperbarui` },
    );
  });
}

export function setBranchActive(branchId: string, isActive: boolean): void {
  updateDatabase((database) => {
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

    return appendActivity(
      {
        ...database,
        branches: database.branches.map((branch) =>
          branch.id === branchId ? { ...branch, isActive } : branch,
        ),
      },
      {
        action: "Mengubah",
        detail: `Cabang ${target.name} ${isActive ? "diaktifkan" : "dinonaktifkan"}`,
      },
    );
  });
}
