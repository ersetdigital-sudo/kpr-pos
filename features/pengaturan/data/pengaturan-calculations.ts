import type { AppDatabase, Transaction } from "@/lib/store/types";
import { createSeedDatabase } from "@/lib/store/seed";
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

function buildSampleTransaction(database: AppDatabase): Transaction {
  const seed = createSeedDatabase();
  const transaction = seed.transactions[0];

  if (!transaction) {
    throw new Error("Data contoh struk tidak tersedia");
  }

  return {
    ...transaction,
    invoiceNumber: "INV-PREVIEW",
    branchId: database.branches[0]?.id ?? transaction.branchId,
    cashierId: database.employees[0]?.id ?? transaction.cashierId,
    payment: {
      method: transaction.payment.method,
      cashReceived: transaction.payment.cashReceived,
      change: transaction.payment.change,
    },
  };
}
