import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Branch,
  ReceiptPaperSize,
  SalesBonusSettings,
  SalesBonusType,
  StoreSettings,
} from "@/lib/store/types";
import type { PaymentMethod } from "@/types";
import type { SettingsBranchSnapshot } from "@/features/pengaturan/types";

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

export async function readSettingsBranchSnapshot(): Promise<SettingsBranchSnapshot> {
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
