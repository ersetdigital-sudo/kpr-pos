"use client";

import { recordActivity } from "@/lib/store/activity";
import {
  ensurePrintDocumentAction,
  getPrintDocumentAction,
} from "@/features/documents/cloud-actions";
import type {
  EnsurePrintDocumentInput,
  PrintDocumentRecord,
  PrintDocumentSourceType,
  PrintDocumentType,
} from "@/features/documents/types";

/** Menyiapkan nomor dan isian dokumen; nomor yang sudah ada tidak berubah. */
export async function ensurePrintDocument(
  input: EnsurePrintDocumentInput,
): Promise<PrintDocumentRecord> {
  const result = await ensurePrintDocumentAction(input);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

/** Isian surat jalan tersimpan; null bila dokumen belum pernah dibuat. */
export async function loadPrintDocument(
  docType: PrintDocumentType,
  sourceType: PrintDocumentSourceType,
  sourceId: string,
): Promise<PrintDocumentRecord | null> {
  const result = await getPrintDocumentAction(docType, sourceType, sourceId);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export function logDocumentPrinted(
  record: PrintDocumentRecord,
  sourceNumber: string,
): void {
  const label =
    record.docType === "invoice" ? "Invoice" : "Surat jalan";
  recordActivity({
    action: "Mencetak",
    detail: `${label} ${record.documentNumber} · ${sourceNumber}`,
  });
}
