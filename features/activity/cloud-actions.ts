"use server";

import { getAuthSession, getAuthorizedSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CloudActionResult, CloudBootstrapResult } from "@/lib/cloud/result";
import type { ActivityAction, ActivityLog } from "@/lib/store/types";
import type { Role } from "@/constants/roles";
import type {
  ActivityBootstrapPayload,
  ActivitySnapshot,
} from "@/lib/cloud/attendance-types";

interface ActivityRow {
  id: string;
  at: string;
  user_id: string;
  user_name: string;
  role: string;
  branch_id: string;
  action: string;
  detail: string;
}

function mapLog(row: ActivityRow): ActivityLog {
  return {
    id: row.id,
    at: row.at,
    userId: row.user_id,
    userName: row.user_name,
    role: row.role as Role,
    branchId: row.branch_id,
    action: row.action as ActivityAction,
    detail: row.detail,
  };
}

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

export async function fetchActivitySnapshotAction(): Promise<ActivitySnapshot> {
  const session = await getAuthSession();
  if (!session) throw new Error("Sesi pengguna tidak ditemukan");

  if (!session.permissions.canExportReports) {
    return { activityLogs: [], isEmpty: true };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("activity_logs")
    .select("id,at,user_id,user_name,role,branch_id,action,detail")
    .order("at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const activityLogs = ((data ?? []) as ActivityRow[]).map(mapLog);
  return { activityLogs, isEmpty: activityLogs.length === 0 };
}

export async function bootstrapActivityAction(
  payload: ActivityBootstrapPayload,
): Promise<CloudBootstrapResult> {
  const session = await getAuthorizedSession("canExportReports");
  if (!session) {
    return { ok: false, error: "Anda tidak punya akses memindahkan log." };
  }

  const result = await callServiceRpc<boolean>("fn_bootstrap_activity", {
    p_payload: payload,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, bootstrapped: result.data === true };
}
