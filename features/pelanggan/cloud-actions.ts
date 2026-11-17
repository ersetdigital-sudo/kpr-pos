"use server";

import {
  getAuthSession,
  getAuthorizedSession,
} from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import type { Customer } from "@/lib/store/types";
import type {
  CustomerActionResult,
  CustomerActiveResult,
  CustomerDeleteResult,
  CustomerInput,
  CustomerManagementResult,
  CustomerMergeResult,
} from "@/features/pelanggan/types";

interface CustomerJson {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  npwp: string | null;
  allowTempo: boolean;
  isActive: boolean;
  branchId: string | null;
}

const NO_ACCESS = "Anda tidak punya akses data pelanggan.";
const NO_MANAGE_ACCESS =
  "Anda tidak berwenang mengelola data pelanggan.";

function fail(message: string): CustomerActionResult {
  return { ok: false, error: message };
}

function mapCustomerJson(row: CustomerJson): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    address: row.address ?? "",
    npwp: row.npwp ?? "",
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
      address: input.address?.trim() ?? "",
      npwp: input.npwp?.trim() ?? "",
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

export async function deleteCustomerAction(
  customerId: string,
): Promise<CustomerManagementResult<CustomerDeleteResult>> {
  const session = await getAuthorizedSession("canManageCustomerData");
  if (!session) return { ok: false, error: NO_MANAGE_ACCESS };

  const result = await callServiceRpc<CustomerDeleteResult>(
    "fn_delete_customer",
    {
      p_id: customerId,
      p_actor_id: session.employee.id,
    },
  );

  if (!result.ok) return { ok: false, error: result.error };
  if (!result.data) {
    return { ok: false, error: "Pelanggan gagal dihapus" };
  }

  return { ok: true, data: result.data };
}

export async function mergeCustomersAction(
  sourceId: string,
  targetId: string,
): Promise<CustomerManagementResult<CustomerMergeResult>> {
  const session = await getAuthorizedSession("canManageCustomerData");
  if (!session) return { ok: false, error: NO_MANAGE_ACCESS };

  const result = await callServiceRpc<CustomerMergeResult>(
    "fn_merge_customers",
    {
      p_source_id: sourceId,
      p_target_id: targetId,
      p_actor_id: session.employee.id,
    },
  );

  if (!result.ok) return { ok: false, error: result.error };
  if (!result.data) {
    return { ok: false, error: "Pelanggan gagal digabungkan" };
  }

  return { ok: true, data: result.data };
}

export async function setCustomerActiveAction(
  customerId: string,
  isActive: boolean,
): Promise<CustomerManagementResult<CustomerActiveResult>> {
  const session = await getAuthorizedSession("canManageCustomerData");
  if (!session) return { ok: false, error: NO_MANAGE_ACCESS };

  const result = await callServiceRpc<CustomerActiveResult>(
    "fn_set_customer_active",
    {
      p_id: customerId,
      p_is_active: isActive,
      p_actor_id: session.employee.id,
    },
  );

  if (!result.ok) return { ok: false, error: result.error };
  if (!result.data) {
    return { ok: false, error: "Status pelanggan gagal diubah" };
  }

  return { ok: true, data: result.data };
}
