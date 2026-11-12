"use server";

import { getAuthSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import type { Customer } from "@/lib/store/types";
import type {
  CustomerActionResult,
  CustomerInput,
} from "@/features/pelanggan/types";

interface CustomerJson {
  id: string;
  name: string;
  phone: string;
  allowTempo: boolean;
  isActive: boolean;
  branchId: string | null;
}

const NO_ACCESS = "Anda tidak punya akses data pelanggan.";

function fail(message: string): CustomerActionResult {
  return { ok: false, error: message };
}

function mapCustomerJson(row: CustomerJson): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    allowTempo: Boolean(row.allowTempo),
    isActive: row.isActive !== false,
    branchId: row.branchId ?? null,
  };
}

export async function saveCustomerAction(
  input: CustomerInput,
): Promise<CustomerActionResult> {
  const session = await getAuthSession();
  if (!session) return fail("Sesi pengguna tidak ditemukan");

  const {
    canUseCashier,
    canCreateSalesOrder,
    canManageSalesOrders,
    canSetCustomerTempo,
  } = session.permissions;

  if (
    !canUseCashier &&
    !canCreateSalesOrder &&
    !canManageSalesOrders &&
    !canSetCustomerTempo
  ) {
    return fail(NO_ACCESS);
  }

  const name = input.name.trim();
  if (name.length < 2) return fail("Nama pelanggan minimal 2 karakter");

  const result = await callServiceRpc<CustomerJson>("fn_save_customer", {
    p_payload: {
      id: input.id ?? "",
      name,
      phone: input.phone.trim(),
      allowTempo: input.allowTempo,
      branchId: input.branchId ?? session.branch.id,
      actorId: session.employee.id,
    },
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Pelanggan gagal disimpan" : result.error);
  }

  return { ok: true, data: mapCustomerJson(result.data) };
}
