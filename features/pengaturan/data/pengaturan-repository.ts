"use client";

import { createId, appendActivity, recordActivity } from "@/lib/store/activity";
import {
  resetDatabase,
  updateDatabase,
  useHydratedDatabase,
} from "@/lib/store/store";
import type {
  AppDatabase,
  AttendanceSettings,
  BankAccount,
  ReceiptSettings,
  SalesBonusSettings,
} from "@/lib/store/types";
import { formatDateShort } from "@/lib/format";
import type {
  BankAccountFormInput,
  BusinessFormInput,
} from "@/features/pengaturan/types";
import type { PaymentMethod } from "@/types";

export function usePengaturanData(): AppDatabase | null {
  return useHydratedDatabase();
}

function validateBusiness(input: BusinessFormInput): void {
  if (input.name.trim().length < 2) {
    throw new Error("Nama usaha minimal 2 karakter");
  }
  if (input.address.trim().length < 5) {
    throw new Error("Alamat usaha minimal 5 karakter");
  }
  if (input.phone.replace(/\D/g, "").length < 8) {
    throw new Error("No. telp minimal 8 digit");
  }
}

export function updateBusinessProfile(input: BusinessFormInput): void {
  updateDatabase((database) => {
    validateBusiness(input);

    return appendActivity(
      {
        ...database,
        settings: {
          ...database.settings,
          business: {
            name: input.name.trim(),
            address: input.address.trim(),
            phone: input.phone.trim(),
            logoUrl: input.logoUrl || undefined,
          },
        },
      },
      { action: "Mengubah", detail: "Pengaturan profil usaha diperbarui" },
    );
  });
}

export function togglePaymentMethod(
  method: PaymentMethod,
  enabled: boolean,
): void {
  updateDatabase((database) => {
    const current = database.settings.payment.enabledMethods;
    const next = enabled
      ? [...new Set([...current, method])]
      : current.filter((item) => item !== method);

    if (next.length === 0) {
      throw new Error("Minimal satu metode pembayaran harus aktif");
    }

    return appendActivity(
      {
        ...database,
        settings: {
          ...database.settings,
          payment: { ...database.settings.payment, enabledMethods: next },
        },
      },
      {
        action: "Mengubah",
        detail: `Metode ${method} ${enabled ? "diaktifkan" : "dinonaktifkan"}`,
      },
    );
  });
}

function validateBankAccount(input: BankAccountFormInput): void {
  if (input.bankName.trim().length < 2) {
    throw new Error("Nama bank minimal 2 karakter");
  }
  if (input.accountNumber.replace(/\s/g, "").length < 5) {
    throw new Error("Nomor rekening minimal 5 karakter");
  }
  if (input.accountHolder.trim().length < 2) {
    throw new Error("Nama pemilik rekening minimal 2 karakter");
  }
}

export function addBankAccount(input: BankAccountFormInput): void {
  updateDatabase((database) => {
    validateBankAccount(input);

    const account: BankAccount = {
      id: createId("bank"),
      bankName: input.bankName.trim(),
      accountNumber: input.accountNumber.trim(),
      accountHolder: input.accountHolder.trim(),
    };

    return appendActivity(
      {
        ...database,
        settings: {
          ...database.settings,
          payment: {
            ...database.settings.payment,
            bankAccounts: [...database.settings.payment.bankAccounts, account],
          },
        },
      },
      { action: "Membuat", detail: `Rekening ${account.bankName} ditambahkan` },
    );
  });
}

export function updateBankAccount(
  accountId: string,
  input: BankAccountFormInput,
): void {
  updateDatabase((database) => {
    validateBankAccount(input);

    const target = database.settings.payment.bankAccounts.find(
      (account) => account.id === accountId,
    );

    if (!target) throw new Error("Rekening tidak ditemukan");

    return appendActivity(
      {
        ...database,
        settings: {
          ...database.settings,
          payment: {
            ...database.settings.payment,
            bankAccounts: database.settings.payment.bankAccounts.map(
              (account) =>
                account.id === accountId
                  ? {
                      ...account,
                      bankName: input.bankName.trim(),
                      accountNumber: input.accountNumber.trim(),
                      accountHolder: input.accountHolder.trim(),
                    }
                  : account,
            ),
          },
        },
      },
      {
        action: "Mengubah",
        detail: `Rekening ${target.bankName} diperbarui`,
      },
    );
  });
}

export function deleteBankAccount(accountId: string): void {
  updateDatabase((database) => {
    const accounts = database.settings.payment.bankAccounts;
    const target = accounts.find((account) => account.id === accountId);

    if (!target) throw new Error("Rekening tidak ditemukan");

    const transferEnabled =
      database.settings.payment.enabledMethods.includes("Transfer");

    if (transferEnabled && accounts.length <= 1) {
      throw new Error(
        "Minimal satu rekening harus tersedia selama Transfer aktif",
      );
    }

    return appendActivity(
      {
        ...database,
        settings: {
          ...database.settings,
          payment: {
            ...database.settings.payment,
            bankAccounts: accounts.filter(
              (account) => account.id !== accountId,
            ),
          },
        },
      },
      { action: "Menghapus", detail: `Rekening ${target.bankName} dihapus` },
    );
  });
}

export function updateSalesBonus(input: SalesBonusSettings): void {
  updateDatabase((database) => {
    if (input.type === "per_piece" && input.perPieceAmount <= 0) {
      throw new Error("Bonus per pcs harus lebih dari 0");
    }

    if (
      input.type === "percent" &&
      (input.percentRate <= 0 || input.percentRate > 100)
    ) {
      throw new Error("Persentase bonus harus antara 1 dan 100");
    }

    if (input.type === "tiered") {
      if (input.tiers.length === 0) {
        throw new Error("Tambahkan minimal satu tingkat target");
      }

      const targets = new Set<number>();

      input.tiers.forEach((tier) => {
        if (tier.minQuantity < 0) {
          throw new Error("Target pcs tidak boleh negatif");
        }
        if (tier.amountPerPiece <= 0) {
          throw new Error("Bonus per pcs tiap tingkat harus lebih dari 0");
        }
        if (targets.has(tier.minQuantity)) {
          throw new Error("Target pcs antar tingkat tidak boleh sama");
        }
        targets.add(tier.minQuantity);
      });
    }

    const tiers = [...input.tiers].sort(
      (first, second) => second.minQuantity - first.minQuantity,
    );

    return appendActivity(
      {
        ...database,
        settings: {
          ...database.settings,
          salesBonus: { ...input, tiers },
          // Nilai lama ikut diselaraskan agar pembaca lama tetap konsisten.
          salesBonusPerPiece: input.perPieceAmount,
        },
      },
      { action: "Mengubah", detail: "Aturan bonus sales diperbarui" },
    );
  });
}

export function updateReceiptSettings(input: ReceiptSettings): void {
  updateDatabase((database) => {
    if (input.footerText.trim().length < 3) {
      throw new Error("Teks footer struk minimal 3 karakter");
    }

    return appendActivity(
      {
        ...database,
        settings: {
          ...database.settings,
          receipt: {
            paperSize: input.paperSize,
            footerText: input.footerText.trim(),
          },
        },
      },
      {
        action: "Mengubah",
        detail: `Pengaturan struk ${input.paperSize}mm diperbarui`,
      },
    );
  });
}

export function updateAttendanceSettings(input: AttendanceSettings): void {
  updateDatabase((database) => {
    if (!input.workStartTime || !input.workEndTime) {
      throw new Error("Jam masuk dan jam pulang wajib diisi");
    }
    if (input.workStartTime >= input.workEndTime) {
      throw new Error("Jam pulang harus setelah jam masuk");
    }

    return appendActivity(
      {
        ...database,
        settings: { ...database.settings, attendance: input },
      },
      {
        action: "Mengubah",
        detail: `Jam kerja ${input.workStartTime}–${input.workEndTime} diperbarui`,
      },
    );
  });
}

/** Mengembalikan seluruh data ke data demo awal. */
export function resetDemoData(): void {
  resetDatabase();
  recordActivity({
    action: "Mengubah",
    detail: `Data demo direset ke data awal (${formatDateShort(new Date())})`,
  });
}
