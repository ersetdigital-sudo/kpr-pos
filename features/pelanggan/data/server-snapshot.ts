import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Customer } from "@/lib/store/types";

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  npwp: string | null;
  allow_tempo: boolean;
  is_active: boolean;
  branch_id: string | null;
}

export const CUSTOMER_COLUMNS =
  "id,name,phone,address,npwp,allow_tempo,is_active,branch_id";

export function mapCustomerRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    address: row.address ?? "",
    npwp: row.npwp ?? "",
    allowTempo: row.allow_tempo,
    isActive: row.is_active,
    branchId: row.branch_id,
  };
}

/** Master pelanggan; dibaca untuk semua role yang memakai pesanan/kasir. */
export async function readCustomers(): Promise<Customer[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(500);

  if (error) throw new Error(error.message);

  return ((data ?? []) as CustomerRow[]).map(mapCustomerRow);
}
