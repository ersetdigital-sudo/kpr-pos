"use server";

import { getAuthorizedSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import type { Kasbon } from "@/lib/store/types";
import { stagePermissionKey } from "@/features/kasbon/data/kasbon-calculations";
import type {
  KasbonFormInput,
  KasbonReviewInput,
  KasbonWriteResult,
} from "@/features/kasbon/types";

const NO_ACCESS = "Anda tidak punya akses kasbon.";

function fail(message: string): KasbonWriteResult {
  return { ok: false, error: message };
}

export async function submitKasbonAction(
  input: KasbonFormInput,
): Promise<KasbonWriteResult> {
  const session = await getAuthorizedSession("canAccessKasbon");
  if (!session) return fail(NO_ACCESS);

  if (input.amount <= 0) return fail("Nominal kasbon harus lebih dari 0.");
  if (input.reason.trim().length < 3) {
    return fail("Alasan minimal 3 karakter.");
  }

  const result = await callServiceRpc<Kasbon>("fn_submit_kasbon", {
    p_payload: {
      employeeId: session.employee.id,
      amount: input.amount,
      reason: input.reason.trim(),
      repaymentMethod: input.repaymentMethod,
      tempoValue:
        input.repaymentMethod === "tempo" ? input.tempoValue : null,
      tempoUnit: input.repaymentMethod === "tempo" ? input.tempoUnit : null,
    },
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Kasbon gagal diajukan." : result.error);
  }

  return { ok: true, data: result.data };
}

export async function reviewKasbonAction(
  input: KasbonReviewInput,
): Promise<KasbonWriteResult> {
  const session = await getAuthorizedSession(
    stagePermissionKey(input.stage),
  );
  if (!session) {
    return fail("Anda tidak berwenang menyetujui tahap ini.");
  }

  const result = await callServiceRpc<Kasbon>("fn_review_kasbon", {
    p_kasbon_id: input.kasbonId,
    p_stage: input.stage,
    p_decision: input.decision,
    p_actor_id: session.employee.id,
    p_note: input.note.trim(),
  });

  if (!result.ok || !result.data) {
    return fail(
      result.ok ? "Keputusan kasbon gagal disimpan." : result.error,
    );
  }

  return { ok: true, data: result.data };
}

export async function settleKasbonAction(
  kasbonId: string,
): Promise<KasbonWriteResult> {
  const session = await getAuthorizedSession("canSettleKasbon");
  if (!session) {
    return fail("Anda tidak berwenang menandai kasbon lunas.");
  }

  const result = await callServiceRpc<Kasbon>("fn_settle_kasbon", {
    p_kasbon_id: kasbonId,
    p_actor_id: session.employee.id,
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Kasbon gagal ditandai lunas." : result.error);
  }

  return { ok: true, data: result.data };
}
