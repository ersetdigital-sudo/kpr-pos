"use server";

import { getAuthorizedSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import type { CloudActionResult } from "@/lib/cloud/result";
import type {
  ReceiptPaperSize,
  SalesBonusSettings,
} from "@/lib/store/types";
import type { PaymentMethod } from "@/types";
import type {
  BankAccountFormInput,
  BusinessFormInput,
} from "@/features/pengaturan/types";

function fail(message: string): CloudActionResult {
  return { ok: false, error: message };
}

async function settingsWrite(
  name: string,
  args: Record<string, unknown>,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageSettings");
  if (!session) return fail("Anda tidak punya akses mengubah pengaturan.");

  const result = await callServiceRpc(name, args);
  return result.ok ? { ok: true } : fail(result.error);
}

export async function updateBusinessProfileAction(
  input: BusinessFormInput,
): Promise<CloudActionResult> {
  return settingsWrite("fn_update_business_profile", {
    p_name: input.name,
    p_address: input.address,
    p_phone: input.phone,
    p_logo_url: input.logoUrl ?? "",
  });
}

export async function togglePaymentMethodAction(
  method: PaymentMethod,
  enabled: boolean,
): Promise<CloudActionResult> {
  return settingsWrite("fn_toggle_payment_method", {
    p_method: method,
    p_enabled: enabled,
  });
}

export async function addBankAccountAction(
  input: BankAccountFormInput,
): Promise<CloudActionResult> {
  return settingsWrite("fn_add_bank_account", {
    p_bank_name: input.bankName,
    p_account_number: input.accountNumber,
    p_account_holder: input.accountHolder,
  });
}

export async function updateBankAccountAction(
  accountId: string,
  input: BankAccountFormInput,
): Promise<CloudActionResult> {
  return settingsWrite("fn_update_bank_account", {
    p_id: accountId,
    p_bank_name: input.bankName,
    p_account_number: input.accountNumber,
    p_account_holder: input.accountHolder,
  });
}

export async function deleteBankAccountAction(
  accountId: string,
): Promise<CloudActionResult> {
  return settingsWrite("fn_delete_bank_account", { p_id: accountId });
}

export async function updateReceiptSettingsAction(
  paperSize: ReceiptPaperSize,
  footerText: string,
): Promise<CloudActionResult> {
  return settingsWrite("fn_update_receipt_settings", {
    p_paper_size: paperSize,
    p_footer: footerText,
  });
}

export async function updateAttendanceSettingsAction(
  workStartTime: string,
  workEndTime: string,
): Promise<CloudActionResult> {
  return settingsWrite("fn_update_attendance_settings", {
    p_start: workStartTime,
    p_end: workEndTime,
  });
}

export async function updateSalesBonusAction(
  settings: SalesBonusSettings,
): Promise<CloudActionResult> {
  return settingsWrite("fn_update_sales_bonus", {
    p_type: settings.type,
    p_per_piece: settings.perPieceAmount,
    p_percent: settings.percentRate,
    p_tiers: settings.tiers,
  });
}
