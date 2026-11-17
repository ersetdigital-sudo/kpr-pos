"use server";

import { ACTIVITY_ACTIONS } from "@/constants/activity";
import type { Role } from "@/constants/roles";
import { readActivityLogs } from "@/features/activity/data/server-snapshot";
import {
  getAuthSession,
  getAuthorizedSession,
} from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import type { CloudActionResult } from "@/lib/cloud/result";
import type { ActivityAction, ActivityLog } from "@/lib/store/types";

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

export interface ActivityLogExportInput {
  start?: string;
  end?: string;
  branchId?: string;
  role?: Role;
  userId?: string;
  action?: ActivityAction;
}

export type ActivityLogExportResult =
  | { ok: true; data: ActivityLog[] }
  | { ok: false; error: string };

/** Ekspor log memakai query DB penuh, bukan batas 200 baris snapshot layar. */
export async function exportActivityLogsAction(
  input: ActivityLogExportInput,
): Promise<ActivityLogExportResult> {
  const session = await getAuthorizedSession("canExportReports");
  if (!session) {
    return { ok: false, error: "Anda tidak punya akses log aktivitas" };
  }

  if (
    input.action &&
    !(ACTIVITY_ACTIONS as readonly string[]).includes(input.action)
  ) {
    return { ok: false, error: "Jenis aksi tidak valid" };
  }

  const branchId = session.permissions.canViewAllBranches
    ? input.branchId
    : session.branch.id;

  try {
    const data = await readActivityLogs(session, {
      start: input.start,
      end: input.end,
      branchId,
      role: input.role,
      userId: input.userId,
      action: input.action,
      limit: 5000,
    });

    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Log aktivitas gagal dimuat",
    };
  }
}
