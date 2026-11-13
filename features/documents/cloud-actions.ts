"use server";

import { getAuthorizedSession } from "@/lib/auth/session";
import { callServiceRpc } from "@/lib/cloud/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  EnsurePrintDocumentInput,
  PrintDocumentActionResult,
  PrintDocumentLookupResult,
  PrintDocumentRecord,
  PrintDocumentSourceType,
  PrintDocumentType,
} from "@/features/documents/types";

interface DocumentJson {
  id: string;
  docType: PrintDocumentType;
  sourceType: PrintDocumentSourceType;
  sourceId: string;
  branchId: string;
  documentNumber: string;
  docDate: string;
  driverName: string;
  vehicleNumber: string;
  note: string;
  createdByName: string;
}

interface DocumentRow {
  id: string;
  doc_type: PrintDocumentType;
  source_type: PrintDocumentSourceType;
  source_id: string;
  branch_id: string;
  document_number: string;
  doc_date: string;
  driver_name: string;
  vehicle_number: string;
  note: string;
  created_by_name: string;
}

function fail(message: string): { ok: false; error: string } {
  return { ok: false, error: message };
}

function mapJson(row: DocumentJson): PrintDocumentRecord {
  return {
    id: row.id,
    docType: row.docType,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    branchId: row.branchId,
    documentNumber: row.documentNumber,
    docDate: row.docDate,
    driverName: row.driverName ?? "",
    vehicleNumber: row.vehicleNumber ?? "",
    note: row.note ?? "",
    createdByName: row.createdByName ?? "",
  };
}

function mapRow(row: DocumentRow): PrintDocumentRecord {
  return {
    id: row.id,
    docType: row.doc_type,
    sourceType: row.source_type,
    sourceId: row.source_id,
    branchId: row.branch_id,
    documentNumber: row.document_number,
    docDate: row.doc_date,
    driverName: row.driver_name ?? "",
    vehicleNumber: row.vehicle_number ?? "",
    note: row.note ?? "",
    createdByName: row.created_by_name ?? "",
  };
}

async function canAccessSourceBranch(
  branchId: string,
): Promise<boolean> {
  const session = await getAuthorizedSession("canPrintDocuments");
  if (!session) return false;
  return (
    session.permissions.canViewAllBranches ||
    session.branch.id === branchId
  );
}

export async function ensurePrintDocumentAction(
  input: EnsurePrintDocumentInput,
): Promise<PrintDocumentActionResult> {
  const session = await getAuthorizedSession("canPrintDocuments");
  if (!session) {
    return fail("Role Anda tidak boleh mencetak dokumen.");
  }

  const result = await callServiceRpc<DocumentJson>("fn_ensure_print_document", {
    p_payload: {
      ...input,
      actorId: session.employee.id,
    },
  });

  if (!result.ok || !result.data) {
    return fail(result.ok ? "Dokumen gagal disiapkan" : result.error);
  }

  return { ok: true, data: mapJson(result.data) };
}

/** Membaca isian surat jalan yang sudah pernah disimpan agar reprint konsisten. */
export async function getPrintDocumentAction(
  docType: PrintDocumentType,
  sourceType: PrintDocumentSourceType,
  sourceId: string,
): Promise<PrintDocumentLookupResult> {
  const session = await getAuthorizedSession("canPrintDocuments");
  if (!session) {
    return fail("Role Anda tidak boleh mencetak dokumen.");
  }

  const admin = createSupabaseAdminClient();
  const sourceTable =
    sourceType === "sales_order" ? "sales_orders" : "transactions";
  const { data: sourceRow, error: sourceError } = await admin
    .from(sourceTable)
    .select("branch_id")
    .eq("id", sourceId)
    .maybeSingle();

  if (sourceError) return fail(sourceError.message);
  if (!sourceRow) return fail("Data sumber dokumen tidak ditemukan.");
  if (!(await canAccessSourceBranch(sourceRow.branch_id as string))) {
    return fail("Cabang tidak sesuai akses Anda.");
  }

  const { data, error } = await admin
    .from("print_documents")
    .select(
      "id,doc_type,source_type,source_id,branch_id,document_number,doc_date,driver_name,vehicle_number,note,created_by_name",
    )
    .eq("doc_type", docType)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (error) return fail(error.message);

  return {
    ok: true,
    data: data ? mapRow(data as DocumentRow) : null,
  };
}
