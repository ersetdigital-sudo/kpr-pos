import type { AppDatabase, Transaction } from "@/lib/store/types";
import type { ReceiptViewData } from "@/features/kasir/types";

/**
 * Struk contoh untuk preview di Pengaturan: memakai transaksi terakhir bila ada,
 * kalau belum ada memakai transaksi contoh yang tidak disimpan ke store.
 */
export function buildReceiptPreview(database: AppDatabase): ReceiptViewData {
  const branch =
    database.branches.find(
      (item) => item.id === database.session.activeBranchId,
    ) ?? database.branches[0];
  const cashier =
    database.employees.find(
      (item) => item.id === database.session.currentEmployeeId,
    ) ?? database.employees[0];

  const transaction: Transaction =
    database.transactions[0] ?? buildSampleTransaction(database);

  const bank = transaction.payment.bankAccountId
    ? database.settings.payment.bankAccounts.find(
        (account) => account.id === transaction.payment.bankAccountId,
      )
    : undefined;

  return {
    transaction,
    branchName: branch?.name ?? "-",
    branchAddress: branch?.address ?? "-",
    businessName: database.settings.business.name,
    businessPhone: database.settings.business.phone,
    logoUrl: database.settings.business.logoUrl,
    cashierName: cashier?.name ?? "Kasir",
    salesName: null,
    bankName: bank?.bankName ?? null,
    paperSize: database.settings.receipt.paperSize,
    footerText: database.settings.receipt.footerText,
  };
}

/** Contoh struk netral untuk preview; tidak pernah disimpan ke store. */
function buildSampleTransaction(database: AppDatabase): Transaction {
  const product = database.products[0];
  const unitPrice = product?.price ?? 15_000;
  const unitCost = product?.costPrice ?? 10_000;

  return {
    id: "preview",
    invoiceNumber: "INV-PREVIEW",
    branchId: database.branches[0]?.id ?? "",
    cashierId: database.employees[0]?.id ?? "",
    salesEmployeeId: null,
    items: [
      {
        productId: product?.id ?? "preview",
        productName: product?.name ?? "Contoh Produk",
        unitPrice,
        unitCost,
        quantity: 1,
        lineTotal: unitPrice,
      },
    ],
    subtotal: unitPrice,
    discount: { type: "nominal", value: 0, amount: 0 },
    total: unitPrice,
    payment: { method: "Cash", cashReceived: unitPrice, change: 0 },
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}
