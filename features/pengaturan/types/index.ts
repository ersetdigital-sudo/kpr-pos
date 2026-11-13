import type {
  Branch,
  BranchDocumentProfile,
  StoreSettings,
} from "@/lib/store/types";

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

export type BranchDocumentProfileFormInput = BranchDocumentProfile;

export interface SettingsBranchSnapshot {
  settings: StoreSettings | null;
  branches: Branch[];
  isEmpty: boolean;
}