import type {
  Kasbon,
  KasbonApproval,
  KasbonDecision,
  KasbonRepaymentMethod,
  KasbonStage,
  KasbonStatus,
  KasbonTempoUnit,
} from "@/lib/store/types";

export type {
  KasbonDecision,
  KasbonRepaymentMethod,
  KasbonStage,
  KasbonStatus,
  KasbonTempoUnit,
};

/** Baris kasbon siap tampil: entitas + nama karyawan/cabang. */
export interface KasbonRow extends Kasbon {
  employeeName: string;
  initials: string;
  branchName: string;
}

export type KasbonStatusFilter =
  | "all"
  | "menunggu"
  | "Disetujui"
  | "Lunas"
  | "Ditolak";

/** Status satu tahap pada stepper persetujuan. */
export type KasbonStepState = "selesai" | "berjalan" | "menunggu" | "ditolak";

export interface KasbonStageState {
  stage: KasbonStage;
  state: KasbonStepState;
  approval: KasbonApproval | null;
}

export interface KasbonStats {
  activeCount: number;
  activeAmount: number;
  awaitingMyApproval: number;
  nearestDueDate: string | null;
  nearestDueName: string | null;
  overdueCount: number;
}

export interface KasbonFormInput {
  amount: number;
  reason: string;
  repaymentMethod: KasbonRepaymentMethod;
  tempoValue: number | null;
  tempoUnit: KasbonTempoUnit | null;
}

export interface KasbonReviewInput {
  kasbonId: string;
  stage: KasbonStage;
  decision: KasbonDecision;
  note: string;
}

export type KasbonWriteResult =
  | { ok: true; data: Kasbon }
  | { ok: false; error: string };
