import { formatDateShort } from "@/lib/format";
import type { AppDatabase } from "@/lib/store/types";
import type {
  DeliveryNoteViewData,
  DocumentLetterhead,
  DocumentLine,
  DocumentParty,
  DocumentSource,
  DocumentSourceRef,
  InvoiceViewData,
  PrintDocumentRecord,
  PrintDocumentType,
} from "@/features/documents/types";

const DEFAULT_UNIT = "pcs";

function emptyLetterhead(): DocumentLetterhead {
  return {
    businessName: "",
    businessAddress: "",
    businessPhone: "",
    npwp: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountHolder: "",
  };
}

function buildLetterhead(
  database: AppDatabase,
  branchId: string,
): DocumentLetterhead {
  const branch = database.branches.find((item) => item.id === branchId);
  const profile = branch?.documentProfile;

  if (!profile) {
    return {
      ...emptyLetterhead(),
      logoUrl: database.settings.business.logoUrl,
    };
  }

  return {
    businessName: profile.businessName,
    businessAddress: profile.businessAddress,
    businessPhone: profile.businessPhone,
    npwp: profile.npwp,
    bankName: profile.bankName,
    bankAccountNumber: profile.bankAccountNumber,
    bankAccountHolder: profile.bankAccountHolder,
    // Logo hanya dipakai versi A4; versi dot matrix tidak pernah menampilkan logo.
    logoUrl: database.settings.business.logoUrl,
  };
}

function buildParty(
  database: AppDatabase,
  customerId: string | undefined,
  fallbackName: string,
  fallbackPhone: string,
): DocumentParty {
  const customer = customerId
    ? database.customers.find((item) => item.id === customerId)
    : undefined;

  return {
    name: fallbackName || customer?.name || "Pelanggan Umum",
    address: customer?.address ?? "",
    phone: fallbackPhone || customer?.phone || "",
    npwp: customer?.npwp ?? "",
  };
}

function buildLines(
  database: AppDatabase,
  items: readonly {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    discountAmount?: number;
    lineTotal?: number;
  }[],
): DocumentLine[] {
  const productById = new Map(
    database.products.map((product) => [product.id, product]),
  );

  return items.map((item) => {
    const gross = item.unitPrice * item.quantity;
    const discount = item.discountAmount ?? 0;

    return {
      code: productById.get(item.productId)?.sku ?? "-",
      name: item.productName,
      quantity: item.quantity,
      unit: DEFAULT_UNIT,
      unitPrice: item.unitPrice,
      gross,
      discount,
      amount: item.lineTotal ?? gross - discount,
    };
  });
}

/** Satu sumber data untuk invoice, surat jalan, dan faktur pajak nanti. */
export function resolveDocumentSource(
  database: AppDatabase,
  ref: DocumentSourceRef,
): DocumentSource | null {
  if (ref.sourceType === "sales_order") {
    const order = database.salesOrders.find((item) => item.id === ref.sourceId);
    if (!order) return null;

    const linkedTransaction = order.transactionId
      ? database.transactions.find((item) => item.id === order.transactionId)
      : undefined;
    const items = buildLines(database, order.items);
    const subtotal = items.reduce((total, item) => total + item.gross, 0);
    const discount = items.reduce((total, item) => total + item.discount, 0);
    const paidAmount =
      order.status === "Lunas" || order.paidAt
        ? order.total
        : linkedTransaction
          ? linkedTransaction.total
          : 0;
    const remainingAmount = Math.max(order.total - paidAmount, 0);

    return {
      sourceType: "sales_order",
      sourceId: order.id,
      sourceNumber: order.orderNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      transactionId: order.transactionId ?? null,
      branchId: order.branchId,
      createdAt: order.createdAt,
      processedAt: order.processedAt,
      party: buildParty(
        database,
        order.customerId,
        order.customerName,
        order.customerPhone,
      ),
      items,
      subtotal,
      discount,
      taxEnabled: order.taxEnabled,
      taxRate: order.taxRate,
      taxAmount: order.taxAmount,
      shippingMethod: order.shippingMethod,
      shippingCost: order.shippingCost,
      total: order.total,
      paidAmount,
      remainingAmount,
      paymentScheme: order.paymentScheme,
      paymentMethod: linkedTransaction?.payment.method,
      status: order.status,
      dueDate: order.dueDate,
      tempoDays: order.tempoDays,
      salesEmployeeId: order.salesEmployeeId,
      note: order.note,
      isCancelled: order.status === "Dibatalkan",
    };
  }

  const transaction = database.transactions.find(
    (item) => item.id === ref.sourceId,
  );
  if (!transaction) return null;

  const order = database.salesOrders.find(
    (item) => item.transactionId === transaction.id,
  );
  const items = buildLines(database, transaction.items);
  const subtotal = transaction.subtotal;
  const discount = transaction.discount.amount;

  return {
    sourceType: "transaction",
    sourceId: transaction.id,
    sourceNumber: transaction.invoiceNumber,
    orderId: order?.id ?? null,
    orderNumber: order?.orderNumber ?? null,
    transactionId: transaction.id,
    branchId: transaction.branchId,
    createdAt: transaction.createdAt,
    processedAt: order?.processedAt,
    party: buildParty(
      database,
      order?.customerId,
      order?.customerName ?? "Pelanggan Umum",
      order?.customerPhone ?? "",
    ),
    items,
    subtotal,
    discount,
    taxEnabled: transaction.taxEnabled,
    taxRate: transaction.taxRate,
    taxAmount: transaction.taxAmount,
    shippingMethod: transaction.shippingMethod,
    shippingCost: transaction.shippingCost,
    total: transaction.total,
    paidAmount: transaction.total,
    remainingAmount: 0,
    paymentScheme: "cash",
    paymentMethod: transaction.payment.method,
    status: "Lunas",
    dueDate: order?.dueDate,
    tempoDays: order?.tempoDays,
    salesEmployeeId: transaction.salesEmployeeId ?? order?.salesEmployeeId ?? null,
    note: order?.note ?? "",
    isCancelled: Boolean(transaction.refund),
  };
}

export function getDocumentBlockReason(
  database: AppDatabase,
  ref: DocumentSourceRef,
  docType: PrintDocumentType,
): string | null {
  const source = resolveDocumentSource(database, ref);

  if (!source) {
    return "Data sumber dokumen tidak ditemukan.";
  }

  if (source.items.length === 0) {
    return "Dokumen tidak punya item untuk dicetak.";
  }

  if (docType === "invoice") {
    if (source.sourceType === "transaction" && source.isCancelled) {
      return "Transaksi yang sudah direfund tidak bisa dicetak invoice.";
    }
    if (source.sourceType === "sales_order" && source.isCancelled) {
      return "Pesanan dibatalkan tidak bisa dicetak invoice.";
    }
    return null;
  }

  if (source.sourceType !== "sales_order") {
    return "Surat jalan hanya dibuat dari pesanan sales.";
  }

  if (
    source.status === "Menunggu bayar" ||
    source.status === "Belum sinkron" ||
    source.status === "Dibatalkan"
  ) {
    return "Surat jalan hanya untuk pesanan yang sudah diproses.";
  }

  return null;
}

function buildTerms(source: DocumentSource): string {
  const parts: string[] = [];

  if (source.paymentScheme === "tempo" && source.status !== "Lunas") {
    const tenor = source.tempoDays ? `${source.tempoDays} hari` : "sesuai tenor";
    const due = source.dueDate
      ? `, jatuh tempo ${formatDateShort(source.dueDate)}`
      : "";
    parts.push(`Pembayaran tempo ${tenor}${due}.`);
  }

  if (source.note) {
    parts.push(`Catatan: ${source.note}`);
  }

  if (parts.length === 0) {
    parts.push(
      source.status === "Lunas"
        ? "Pembayaran telah diterima."
        : "Pembayaran dilakukan sesuai kesepakatan.",
    );
  }

  return parts.join(" ");
}

export function buildInvoiceView(
  database: AppDatabase,
  source: DocumentSource,
  record: PrintDocumentRecord,
): InvoiceViewData {
  const sales = source.salesEmployeeId
    ? database.employees.find((item) => item.id === source.salesEmployeeId)
    : undefined;
  const branch = database.branches.find((item) => item.id === source.branchId);
  const badge =
    source.status === "Lunas"
      ? "LUNAS"
      : source.paymentScheme === "tempo"
        ? "TEMPO"
        : source.paymentScheme === "cod"
          ? "COD"
          : "TUNAI";

  return {
    letterhead: buildLetterhead(database, source.branchId),
    number: record.documentNumber,
    date: record.docDate || source.createdAt,
    badge,
    party: source.party,
    orderNumber: source.orderNumber,
    dueDate:
      source.paymentScheme === "tempo" ? source.dueDate : undefined,
    tempoDays: source.tempoDays,
    salesName: sales?.name ?? "-",
    branchName: branch?.name ?? "-",
    items: source.items,
    subtotal: source.subtotal,
    discount: source.discount,
    taxEnabled: source.taxEnabled && source.taxAmount > 0,
    taxRate: source.taxRate,
    taxAmount: source.taxAmount,
    shippingMethod: source.shippingMethod,
    shippingCost: source.shippingCost,
    total: source.total,
    paidAmount: source.paidAmount,
    remainingAmount: source.remainingAmount,
    note: source.note,
    termsLine: buildTerms(source),
  };
}

export function buildDeliveryNoteView(
  database: AppDatabase,
  source: DocumentSource,
  record: PrintDocumentRecord,
): DeliveryNoteViewData {
  const sales = source.salesEmployeeId
    ? database.employees.find((item) => item.id === source.salesEmployeeId)
    : undefined;
  const branch = database.branches.find((item) => item.id === source.branchId);

  return {
    letterhead: buildLetterhead(database, source.branchId),
    number: record.documentNumber,
    date: record.docDate || source.processedAt || source.createdAt,
    vehicleNumber: record.vehicleNumber,
    driverName: record.driverName,
    orderNumber: source.orderNumber ?? source.sourceNumber,
    party: source.party,
    salesName: sales?.name ?? "-",
    branchName: branch?.name ?? "-",
    items: source.items,
    note: record.note,
    totalItems: source.items.length,
    totalQuantity: source.items.reduce(
      (total, item) => total + item.quantity,
      0,
    ),
  };
}
