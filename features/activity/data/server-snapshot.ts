import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SessionState } from "@/features/session/types";
import type { Role } from "@/constants/roles";
import type { ActivityAction, ActivityLog } from "@/lib/store/types";

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

export function mapActivityRow(row: ActivityRow): ActivityLog {
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

interface ActivityQuery {
  start?: string;
  end?: string;
  branchId?: string;
  limit?: number;
}

/**
 * Log aktivitas hanya untuk role yang boleh melihat laporan. Untuk laporan,
 * rentang tanggal dan cabang mengikuti filter yang dipilih user.
 */
export async function readActivityLogs(
  session: SessionState,
  query: ActivityQuery = {},
): Promise<ActivityLog[]> {
  if (!session.permissions.canExportReports) return [];

  const admin = createSupabaseAdminClient();

  let request = admin
    .from("activity_logs")
    .select("id,at,user_id,user_name,role,branch_id,action,detail")
    .order("at", { ascending: false })
    .limit(query.limit ?? 200);

  if (query.start) request = request.gte("at", query.start);
  if (query.end) request = request.lte("at", query.end);
  if (query.branchId) request = request.eq("branch_id", query.branchId);

  const { data, error } = await request;

  if (error) throw new Error(error.message);

  return ((data ?? []) as ActivityRow[]).map(mapActivityRow);
}
