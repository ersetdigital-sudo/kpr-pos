import type { SalesOrderStatus, ShippingMethod } from "@/lib/store/types";

export type PrintDocumentType = "invoice" | "surat_jalan";
export type PrintDocumentSourceType = "sales_order" | "transaction";
export type DeliveryNotePaper = "dot_matrix" | "a4";

export interface DocumentSourceRef {
  sourceType: PrintDocumentSourceType;
  sourceId: string;
}

export interface PrintDocumentRecord {
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

export interface DocumentLetterhead {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  npwp: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  logoUrl?: string;
}

export interface DocumentParty {
  name: string;
  address: string;
  phone: string;
  npwp: string;
}

export interface DocumentLine {
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  /** Harga kotor sebelum diskon baris. */
  gross: number;
  discount: number;
  /** Harga kotor dikurangi diskon baris. */
  amount: number;
}

export interface DocumentSource {
  sourceType: PrintDocumentSourceType;
  sourceId: string;
  sourceNumber: string;
  orderId: string | null;
  orderNumber: string | null;
  transactionId: string | null;
  branchId: string;
  createdAt: string;
  processedAt?: string;
  party: DocumentParty;
  items: DocumentLine[];
  subtotal: number;
  discount: number;
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  shippingMethod: ShippingMethod;
  shippingCost: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentScheme: "cash" | "cod" | "tempo";
  paymentMethod?: "Cash" | "QRIS" | "Transfer";
  status: SalesOrderStatus;
  dueDate?: string;
  tempoDays?: number;
  salesEmployeeId: string | null;
  note: string;
  isCancelled: boolean;
}

export interface InvoiceViewData {
  letterhead: DocumentLetterhead;
  number: string;
  date: string;
  badge: "TUNAI" | "COD" | "TEMPO" | "LUNAS";
  party: DocumentParty;
  orderNumber: string | null;
  dueDate?: string;
  tempoDays?: number;
  salesName: string;
  branchName: string;
  items: DocumentLine[];
  subtotal: number;
  discount: number;
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  shippingMethod: ShippingMethod;
  shippingCost: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  note: string;
  termsLine: string;
}

export interface DeliveryNoteViewData {
  letterhead: DocumentLetterhead;
  number: string;
  date: string;
  vehicleNumber: string;
  driverName: string;
  orderNumber: string;
  party: DocumentParty;
  salesName: string;
  branchName: string;
  items: DocumentLine[];
  note: string;
  totalItems: number;
  totalQuantity: number;
}

export interface EnsurePrintDocumentInput {
  docType: PrintDocumentType;
  sourceType: PrintDocumentSourceType;
  sourceId: string;
  driverName?: string;
  vehicleNumber?: string;
  note?: string;
}

export type PrintDocumentActionResult =
  | { ok: true; data: PrintDocumentRecord }
  | { ok: false; error: string };

export type PrintDocumentLookupResult =
  | { ok: true; data: PrintDocumentRecord | null }
  | { ok: false; error: string };

export interface DeliveryNotePage {
  items: DocumentLine[];
  pageNumber: number;
  totalPages: number;
  isLast: boolean;
}
