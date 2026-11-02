"use server";

import { getAuthorizedSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import type { CloudActionResult } from "@/lib/cloud/result";
import type { BranchFormInput } from "@/features/cabang/types";

function fail(message: string): CloudActionResult {
  return { ok: false, error: message };
}

async function branchWrite(
  name: string,
  args: Record<string, unknown>,
): Promise<CloudActionResult> {
  const session = await getAuthorizedSession("canManageBranches");
  if (!session) return fail("Anda tidak punya akses mengubah cabang.");

  const result = await callServiceRpc(name, args);
  return result.ok ? { ok: true } : fail(result.error);
}

export async function createBranchAction(
  input: BranchFormInput,
): Promise<CloudActionResult> {
  return branchWrite("fn_create_branch", {
    p_name: input.name,
    p_address: input.address,
    p_phone: input.phone,
  });
}

export async function updateBranchAction(
  branchId: string,
  input: BranchFormInput,
): Promise<CloudActionResult> {
  return branchWrite("fn_update_branch", {
    p_id: branchId,
    p_name: input.name,
    p_address: input.address,
    p_phone: input.phone,
  });
}

export async function setBranchActiveAction(
  branchId: string,
  isActive: boolean,
): Promise<CloudActionResult> {
  return branchWrite("fn_set_branch_active", {
    p_id: branchId,
    p_active: isActive,
  });
}
