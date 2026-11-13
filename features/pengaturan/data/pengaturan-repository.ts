"use client";

import { recordActivity } from "@/lib/store/activity";
import { getDatabase, useHydratedDatabase } from "@/lib/store/store";
import type {
  AppDatabase,
  AttendanceSettings,
  ReceiptSettings,
  SalesBonusSettings,
} from "@/lib/store/types";
import { formatDateShort } from "@/lib/format";
import type {
  BankAccountFormInput,
  BranchDocumentProfileFormInput,
  BusinessFormInput,
} from "@/features/pengaturan/types";
import {
  addBankAccountAction,
  deleteBankAccountAction,
  togglePaymentMethodAction,
  updateAttendanceSettingsAction,
  updateBankAccountAction,
  updateBranchDocumentProfileAction,
  updateBusinessProfileAction,
  updateReceiptSettingsAction,
  updateSalesBonusAction,
  updateTaxRateAction,
} from "@/features/pengaturan/cloud-actions";
import {
  syncAppFromCloud,
  trackCloudWrite,
} from "@/features/sync/data/app-sync";
import type { CloudActionResult } from "@/lib/cloud/result";
import type { PaymentMethod } from "@/types";

export function usePengaturanData(): AppDatabase | null {
  return useHydratedDatabase();
}

function assertOk(result: CloudActionResult): void {
  if (!result.ok) throw new Error(result.error);
}

async function refreshAfterWrite(): Promise<void> {
  try {
    await syncAppFromCloud({ force: true });
  } catch (error) {
    console.error("Sinkronisasi setelah simpan pengaturan gagal:", error);
  }
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

export async function updateBusinessProfile(
  input: BusinessFormInput,
): Promise<void> {
  validateBusiness(input);

  const result = await trackCloudWrite(() =>
    updateBusinessProfileAction(input),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: "Pengaturan profil usaha diperbarui",
  });
}

export async function updateBranchDocumentProfile(
  branchId: string,
  profile: BranchDocumentProfileFormInput,
): Promise<void> {
  const bankFields = [
    profile.bankName,
    profile.bankAccountNumber,
    profile.bankAccountHolder,
  ].map((value) => value.trim());

  if (bankFields.some(Boolean) && bankFields.some((value) => !value)) {
    throw new Error(
      "Lengkapi nama bank, nomor rekening, dan atas nama sekaligus",
    );
  }

  const branch = getDatabase().branches.find((item) => item.id === branchId);
  const result = await trackCloudWrite(() =>
    updateBranchDocumentProfileAction(branchId, {
      businessName: profile.businessName.trim(),
      businessAddress: profile.businessAddress.trim(),
      businessPhone: profile.businessPhone.trim(),
      npwp: profile.npwp.trim(),
      bankName: profile.bankName.trim(),
      bankAccountNumber: profile.bankAccountNumber.trim(),
      bankAccountHolder: profile.bankAccountHolder.trim(),
    }),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: `Kop dokumen cabang ${branch?.name ?? branchId} diperbarui`,
  });
}

export async function togglePaymentMethod(
  method: PaymentMethod,
  enabled: boolean,
): Promise<void> {
  const current = getDatabase().settings.payment.enabledMethods;
  const next = enabled
    ? [...new Set([...current, method])]
    : current.filter((item) => item !== method);

  if (next.length === 0) {
    throw new Error("Minimal satu metode pembayaran harus aktif");
  }

  const result = await trackCloudWrite(() =>
    togglePaymentMethodAction(method, enabled),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: `Metode ${method} ${enabled ? "diaktifkan" : "dinonaktifkan"}`,
  });
}

function validateBankAccount(input: BankAccountFormInput): void {
  if (input.bankName.trim().length < 2) {
    throw new Error("Nama bank minimal 2 karakter");
  }
  if (input.accountNumber.replace(/\s/g, "").length < 5) {
    throw new Error("Nomor rekening minimal 5 digit");
  }
  if (input.accountHolder.trim().length < 2) {
    throw new Error("Nama pemilik rekening minimal 2 karakter");
  }
}

export async function addBankAccount(
  input: BankAccountFormInput,
): Promise<void> {
  validateBankAccount(input);

  const result = await trackCloudWrite(() => addBankAccountAction(input));
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Membuat",
    detail: `Rekening ${input.bankName.trim()} ditambahkan`,
  });
}

export async function updateBankAccount(
  accountId: string,
  input: BankAccountFormInput,
): Promise<void> {
  validateBankAccount(input);

  const target = getDatabase().settings.payment.bankAccounts.find(
    (account) => account.id === accountId,
  );

  const result = await trackCloudWrite(() =>
    updateBankAccountAction(accountId, input),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: `Rekening ${target?.bankName ?? input.bankName.trim()} diperbarui`,
  });
}

export async function deleteBankAccount(accountId: string): Promise<void> {
  const database = getDatabase();
  const accounts = database.settings.payment.bankAccounts;
  const target = accounts.find((account) => account.id === accountId);

  const transferEnabled =
    database.settings.payment.enabledMethods.includes("Transfer");

  if (transferEnabled && accounts.length <= 1) {
    throw new Error(
      "Minimal satu rekening harus tersedia selama Transfer aktif",
    );
  }

  const result = await trackCloudWrite(() =>
    deleteBankAccountAction(accountId),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Menghapus",
    detail: `Rekening ${target?.bankName ?? accountId} dihapus`,
  });
}

export async function updateSalesBonus(
  input: SalesBonusSettings,
): Promise<void> {
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

  const result = await trackCloudWrite(() => updateSalesBonusAction(input));
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: "Aturan bonus sales diperbarui",
  });
}

export async function updateReceiptSettings(
  input: ReceiptSettings,
): Promise<void> {
  if (input.footerText.trim().length < 3) {
    throw new Error("Teks footer struk minimal 3 karakter");
  }

  const result = await trackCloudWrite(() =>
    updateReceiptSettingsAction(input.paperSize, input.footerText),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: `Pengaturan struk ${input.paperSize}mm diperbarui`,
  });
}

export async function updateTaxRate(rate: number): Promise<void> {
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new Error("Tarif PPN harus antara 0 dan 100");
  }

  const result = await trackCloudWrite(() =>
    updateTaxRateAction(Math.round(rate * 100) / 100),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: `Tarif PPN default menjadi ${Math.round(rate * 100) / 100}%`,
  });
}

export async function updateAttendanceSettings(
  input: AttendanceSettings,
): Promise<void> {
  if (!input.workStartTime || !input.workEndTime) {
    throw new Error("Jam masuk dan jam pulang wajib diisi");
  }
  if (input.workStartTime >= input.workEndTime) {
    throw new Error("Jam pulang harus setelah jam masuk");
  }

  const result = await trackCloudWrite(() =>
    updateAttendanceSettingsAction(input.workStartTime, input.workEndTime),
  );
  assertOk(result);
  await refreshAfterWrite();
  recordActivity({
    action: "Mengubah",
    detail: `Jam kerja ${input.workStartTime}–${input.workEndTime} diperbarui`,
  });
}

/**
 * Memuat ulang cache tampilan dari Supabase. Data demo tidak pernah dibuat
 * lagi karena cloud adalah satu-satunya sumber data.
 */
export function resetDemoData(): void {
  void syncAppFromCloud({ force: true }).catch((error) => {
    console.error("Muat ulang data dari server gagal:", error);
  });

  recordActivity({
    action: "Mengubah",
    detail: `Cache tampilan dimuat ulang dari server (${formatDateShort(new Date())})`,
  });
}
