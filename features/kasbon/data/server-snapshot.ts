import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SessionState } from "@/features/session/types";
import { canSeeAllKasbon } from "@/features/kasbon/data/kasbon-calculations";
import type {
  Kasbon,
  KasbonApproval,
  KasbonDecision,
  KasbonRepaymentMethod,
  KasbonStage,
  KasbonStatus,
  KasbonTempoUnit,
} from "@/lib/store/types";

interface KasbonApprovalRow {
  id: string;
  stage: string;
  decision: string;
  note: string;
  decided_by: string | null;
  decided_by_name: string;
  decided_at: string;
}

interface KasbonRow {
  id: string;
  employee_id: string;
  branch_id: string;
  amount: number;
  reason: string;
  repayment_method: string;
  tempo_value: number | null;
  tempo_unit: string | null;
  due_date: string | null;
  status: string;
  rejection_reason: string;
  approved_at: string | null;
  settled_at: string | null;
  settled_by: string | null;
  settled_by_name: string;
  created_at: string;
  updated_at: string;
  kasbon_approvals: KasbonApprovalRow[] | null;
}

export const KASBON_SELECT =
  "id,employee_id,branch_id,amount,reason,repayment_method,tempo_value,tempo_unit,due_date,status,rejection_reason,approved_at,settled_at,settled_by,settled_by_name,created_at,updated_at,kasbon_approvals(id,stage,decision,note,decided_by,decided_by_name,decided_at)";

export function mapKasbonApprovalRow(row: KasbonApprovalRow): KasbonApproval {
  return {
    id: row.id,
    stage: row.stage as KasbonStage,
    decision: row.decision as KasbonDecision,
    note: row.note,
    decidedById: row.decided_by,
    decidedByName: row.decided_by_name,
    decidedAt: row.decided_at,
  };
}

export function mapKasbonRow(row: KasbonRow): Kasbon {
  return {
    id: row.id,
    employeeId: row.employee_id,
    branchId: row.branch_id,
    amount: row.amount,
    reason: row.reason,
    repaymentMethod: row.repayment_method as KasbonRepaymentMethod,
    tempoValue: row.tempo_value,
    tempoUnit: (row.tempo_unit as KasbonTempoUnit | null) ?? null,
    dueDate: row.due_date,
    status: row.status as KasbonStatus,
    rejectionReason: row.rejection_reason,
    approvedAt: row.approved_at,
    settledAt: row.settled_at,
    settledById: row.settled_by,
    settledByName: row.settled_by_name,
    approvals: (row.kasbon_approvals ?? [])
      .map(mapKasbonApprovalRow)
      .sort((first, second) =>
        first.decidedAt.localeCompare(second.decidedAt),
      ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Snapshot kasbon mengikuti hak baca: pemegang izin lihat-semua/persetujuan
 * membaca seluruh kasbon, karyawan lain hanya kasbon miliknya sendiri.
 */
export async function readKasbonSnapshot(
  session: SessionState,
): Promise<Kasbon[]> {
  const admin = createSupabaseAdminClient();

  let request = admin
    .from("kasbon")
    .select(KASBON_SELECT)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!canSeeAllKasbon(session.permissions)) {
    request = request.eq("employee_id", session.employee.id);
  }

  const { data, error } = await request;

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as KasbonRow[]).map(mapKasbonRow);
}
