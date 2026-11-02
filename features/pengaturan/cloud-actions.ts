"use server";

import { getAuthSession, getAuthorizedSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CloudActionResult,
  CloudBootstrapResult,
} from "@/lib/cloud/result";
import type {
  Branch,
  ReceiptPaperSize,
  SalesBonusSettings,
  SalesBonusType,
  StoreSettings,
} from "@/lib/store/types";
import type { PaymentMethod } from "@/types";
import type {
  BankAccountFormInput,
  BusinessFormInput,
  SettingsBranchBootstrapPayload,
  SettingsBranchSnapshot,
} from "@/features/pengaturan/types";

interface SettingsRow {
  business_name: string;
  business_address: string;
  business_phone: string;
  business_logo_url: string | null;
  enabled_payment_methods: string[];
  receipt_paper_size: number;
  receipt_footer: string;
  work_start_time: string;
  work_end_time: string;
  bonus_type: string;
  bonus_per_piece_amount: number;
  bonus_percent_rate: number | string;
}

interface BankAccountRow {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
}

interface BonusTierRow {
  min_quantity: number;
  amount_per_piece: number;
}

interface BranchRow {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
}

const PAYMENT_METHODS: readonly PaymentMethod[] = ["Cash", "QRIS", "Transfer"];
const BONUS_TYPES: readonly SalesBonusType[] = [
  "per_piece",
  "percent",
  "tiered",
];

function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

function isBonusType(value: string): value is SalesBonusType {
  return (BONUS_TYPES as readonly string[]).includes(value);
}

function fail(message: string): CloudActionResult {
  return { ok: false, error: message };
}

async function readSnapshot(): Promise<SettingsBranchSnapshot> {
  const admin = createSupabaseAdminClient();

  const [settingsResult, bankResult, tierResult, branchResult] =
    await Promise.all([
      admin
        .from("settings")
        .select(
          "business_name,business_address,business_phone,business_logo_url,enabled_payment_methods,receipt_paper_size,receipt_footer,work_start_time,work_end_time,bonus_type,bonus_per_piece_amount,bonus_percent_rate",
        )
        .eq("id", 1)
        .maybeSingle(),
      admin
        .from("bank_accounts")
        .select("id,bank_name,account_number,account_holder")
        .order("sort_order"),
      admin
        .from("bonus_tiers")
        .select("min_quantity,amount_per_piece")
        .order("min_quantity", { ascending: false }),
      admin
        .from("branches")
        .select("id,name,address,phone,is_active")
        .order("name"),
    ]);

  const error =
    settingsResult.error ??
    bankResult.error ??
    tierResult.error ??
    branchResult.error;

  if (error) throw new Error(error.message);

  const settingsRow = settingsResult.data as SettingsRow | null;
  const bankRows = (bankResult.data ?? []) as BankAccountRow[];
  const tierRows = (tierResult.data ?? []) as BonusTierRow[];
  const branchRows = (branchResult.data ?? []) as BranchRow[];

  const branches: Branch[] = branchRows.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    isActive: row.is_active,
  }));

  if (!settingsRow) {
    return { settings: null, branches, isEmpty: true };
  }

  const salesBonus: SalesBonusSettings = {
    type: isBonusType(settingsRow.bonus_type)
      ? settingsRow.bonus_type
      : "per_piece",
    perPieceAmount: settingsRow.bonus_per_piece_amount,
    percentRate: Number(settingsRow.bonus_percent_rate),
    tiers: tierRows.map((row) => ({
      minQuantity: row.min_quantity,
      amountPerPiece: row.amount_per_piece,
    })),
  };

  const settings: StoreSettings = {
    business: {
      name: settingsRow.business_name,
      address: settingsRow.business_address,
      phone: settingsRow.business_phone,
      logoUrl: settingsRow.business_logo_url ?? undefined,
    },
    payment: {
      enabledMethods: settingsRow.enabled_payment_methods.filter(isPaymentMethod),
      bankAccounts: bankRows.map((row) => ({
        id: row.id,
        bankName: row.bank_name,
        accountNumber: row.account_number,
        accountHolder: row.account_holder,
      })),
    },
    salesBonusPerPiece: salesBonus.perPieceAmount,
    salesBonus,
    receipt: {
      paperSize: settingsRow.receipt_paper_size as ReceiptPaperSize,
      footerText: settingsRow.receipt_footer,
    },
    attendance: {
      workStartTime: settingsRow.work_start_time.slice(0, 5),
      workEndTime: settingsRow.work_end_time.slice(0, 5),
    },
  };

  return { settings, branches, isEmpty: false };
}

export async function fetchSettingsBranchSnapshotAction(): Promise<SettingsBranchSnapshot> {
  const session = await getAuthSession();
  if (!session) throw new Error("Sesi pengguna tidak ditemukan");
  return readSnapshot();
}

export async function bootstrapSettingsBranchAction(
  payload: SettingsBranchBootstrapPayload,
): Promise<CloudBootstrapResult> {
  const session = await getAuthorizedSession("canManageSettings");
  if (!session) {
    return {
      ok: false,
      error: "Anda tidak punya akses memindahkan pengaturan.",
    };
  }

  const result = await callServiceRpc<boolean>(
    "fn_bootstrap_settings_branches",
    { p_payload: payload },
  );

  if (!result.ok) return { ok: false, error: result.error };

  return { ok: true, bootstrapped: result.data === true };
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
