import type { Branch, StoreSettings } from "@/lib/store/types";

export interface BusinessFormInput {
  name: string;
  address: string;
  phone: string;
  logoUrl?: string;
}

export interface BankAccountFormInput {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface SettingsBranchSnapshot {
  settings: StoreSettings | null;
  branches: Branch[];
  isEmpty: boolean;
}

export interface SettingsBranchBootstrapPayload {
  settings: StoreSettings;
  branches: Branch[];
}
