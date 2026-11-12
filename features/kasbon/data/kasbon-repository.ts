"use client";

import { formatRupiah } from "@/lib/format";
import { recordActivity } from "@/lib/store/activity";
import { useHydratedDatabase } from "@/lib/store/store";
import type { AppDatabase, Kasbon } from "@/lib/store/types";
import {
  reviewKasbonAction,
  settleKasbonAction,
  submitKasbonAction,
} from "@/features/kasbon/cloud-actions";
import {
  syncAppFromCloud,
  trackCloudWrite,
} from "@/features/sync/data/app-sync";
import type {
  KasbonFormInput,
  KasbonReviewInput,
} from "@/features/kasbon/types";

export function useKasbonData(): AppDatabase | null {
  return useHydratedDatabase();
}

async function refreshAfterKasbon(): Promise<void> {
  try {
    await syncAppFromCloud({ force: true });
  } catch (error) {
    console.error("Sinkronisasi setelah aksi kasbon gagal:", error);
  }
}

export async function submitKasbon(
  input: KasbonFormInput,
): Promise<Kasbon> {
  if (input.amount <= 0) throw new Error("Nominal kasbon harus lebih dari 0");
  if (input.reason.trim().length < 3) {
    throw new Error("Alasan minimal 3 karakter");
  }

  if (input.repaymentMethod === "tempo") {
    if (input.tempoValue === null || input.tempoValue <= 0) {
      throw new Error("Jumlah tempo harus lebih dari 0");
    }
    if (!input.tempoUnit) throw new Error("Satuan tempo wajib dipilih");
  }

  const result = await trackCloudWrite(() => submitKasbonAction(input));
  if (!result.ok) throw new Error(result.error);

  await refreshAfterKasbon();

  recordActivity({
    action: "Membuat",
    detail: `Kasbon ${formatRupiah(result.data.amount)} · ${input.reason.trim()}`,
  });

  return result.data;
}

export async function reviewKasbon(
  input: KasbonReviewInput,
): Promise<void> {
  if (input.decision === "Ditolak" && input.note.trim().length < 3) {
    throw new Error("Alasan penolakan wajib diisi minimal 3 karakter");
  }

  const result = await trackCloudWrite(() => reviewKasbonAction(input));
  if (!result.ok) throw new Error(result.error);

  await refreshAfterKasbon();

  recordActivity({
    action: input.decision === "Ditolak" ? "Membatalkan" : "Mengubah",
    detail: `Kasbon ${formatRupiah(result.data.amount)} tahap ${input.stage} ${input.decision.toLowerCase()}${input.note.trim() ? ` · ${input.note.trim()}` : ""}`,
  });
}

export async function settleKasbon(row: Kasbon): Promise<void> {
  const result = await trackCloudWrite(() => settleKasbonAction(row.id));
  if (!result.ok) throw new Error(result.error);

  await refreshAfterKasbon();

  recordActivity({
    action: "Mengubah",
    detail: `Kasbon ${formatRupiah(row.amount)} ditandai lunas · ${row.repaymentMethod === "tempo" ? "pelunasan masuk Buku Kas" : "potong gaji tanpa catatan Buku Kas"}`,
  });
}
