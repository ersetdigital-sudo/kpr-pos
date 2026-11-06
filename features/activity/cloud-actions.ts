"use server";

import { getAuthSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import type { CloudActionResult } from "@/lib/cloud/result";
import type { ActivityAction } from "@/lib/store/types";

export async function logActivityAction(input: {
  id: string;
  at: string;
  action: ActivityAction;
  detail: string;
}): Promise<CloudActionResult> {
  const session = await getAuthSession();
  if (!session) return { ok: false, error: "Sesi pengguna tidak ditemukan" };

  const result = await callServiceRpc("fn_log_activity", {
    p_payload: {
      id: input.id,
      at: input.at,
      action: input.action,
      detail: input.detail,
      userId: session.employee.id,
      userName: session.employee.name,
      role: session.employee.role,
      branchId: session.branch.id,
    },
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
