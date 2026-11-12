import type { DateRange } from "@/lib/date-range";
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

/** Mode periode rekap: satu bulan penuh atau rentang tanggal bebas. */
export type KasbonRecapPeriodMode = "month" | "range";

/** State filter rekap; halaman menormalkan nilainya sesuai izin pengguna. */
export interface KasbonRecapFilterState {
  periodMode: KasbonRecapPeriodMode;
  /** Format YYYY-MM, dipakai saat periodMode "month". */
  month: string;
  /** Format YYYY-MM-DD, dipakai saat periodMode "range". */
  start: string;
  end: string;
  branchId: string;
  status: KasbonStatusFilter;
  employeeId: string;
}

export interface KasbonRecapStatItem {
  count: number;
  amount: number;
}

export interface KasbonRecapStats {
  requested: KasbonRecapStatItem;
  approved: KasbonRecapStatItem;
  settled: KasbonRecapStatItem;
  outstanding: KasbonRecapStatItem;
  rejected: KasbonRecapStatItem;
}

export interface KasbonEmployeeRecap {
  employeeId: string;
  employeeName: string;
  initials: string;
  branchName: string;
  count: number;
  totalAmount: number;
  rows: KasbonRow[];
}

export interface KasbonRecapLabels {
  period: string;
  branch: string;
  status: string;
  employee: string;
}

export interface KasbonRecapData {
  filters: KasbonRecapFilterState;
  labels: KasbonRecapLabels;
  range: DateRange;
  /** Bagian nama file, mis. "2026-11" atau "2026-11-01-sd-2026-11-30". */
  filePeriod: string;
  rows: KasbonRow[];
  employees: KasbonEmployeeRecap[];
  stats: KasbonRecapStats;
  /** Jumlah per status sebelum filter status, untuk badge filter chip. */
  statusCounts: Record<KasbonStatusFilter, number>;
}
