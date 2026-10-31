"use client";

import { ROLES } from "@/constants/roles";
import { ROLE_PERMISSIONS } from "@/config/permissions";
import {
  appendActivity,
  createId,
  recordActivity,
} from "@/lib/store/activity";
import {
  getDatabase,
  updateDatabase,
  useDatabase,
  useHydratedDatabase,
} from "@/lib/store/store";
import type {
  BankAccount,
  CartDraft,
  Employee,
  Transaction,
  TransactionPayment,
} from "@/lib/store/types";
import { formatDateTimeShort, formatRupiah } from "@/lib/format";
import { isTransactionRefunded } from "@/lib/store/transactions";
import {
  calculateCartTotals,
  calculateDiscountAmount,
  getNextInvoiceNumber,
  reduceStockLevels,
  restoreStockLevels,
} from "@/features/kasir/data/kasir-calculations";
import { selectSession } from "@/features/session/data/session-repository";
import type {
  CartLine,
  CashierData,
  CreateTransactionInput,
  DraftSummary,
  KasirCategory,
  KasirProduct,
  ReceiptViewData,
  RefundTransactionInput,
  RefundTransactionResult,
  SaveDraftInput,
  TransactionHistoryRow,
  TransactionResult,
} from "@/features/kasir/types";
import type { PaymentMethod } from "@/types";

export function getProducts(
  database: ReturnType<typeof getDatabase>,
  branchId: string,
): KasirProduct[] {
  const categoryById = new Map(
    database.categories.map((category) => [category.id, category]),
  );

  return database.products
    .filter((product) => product.isActive)
    .map((product) => {
      const stock = database.stocks.find(
        (level) =>
          level.branchId === branchId && level.productId === product.id,
      );

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        costPrice: product.costPrice,
        stock: stock?.quantity ?? 0,
        categoryId: product.categoryId,
        categoryName:
          categoryById.get(product.categoryId)?.name ?? "Tanpa kategori",
      };
    });
}

export function getCategories(
  database: ReturnType<typeof getDatabase>,
): KasirCategory[] {
  return database.categories
    .filter((category) => category.isActive)
    .map((category) => ({ id: category.id, name: category.name }));
}

export function getSalesEmployees(
  database: ReturnType<typeof getDatabase>,
  branchId: string,
): Employee[] {
  return database.employees.filter(
    (employee) =>
      employee.isActive &&
      employee.role === ROLES.SALES &&
      employee.branchId === branchId,
  );
}

export function getBankAccounts(
  database: ReturnType<typeof getDatabase>,
): BankAccount[] {
  return database.settings.payment.bankAccounts;
}

export function getEnabledMethods(
  database: ReturnType<typeof getDatabase>,
): PaymentMethod[] {
  return database.settings.payment.enabledMethods;
}

export function getTransactions(
  database: ReturnType<typeof getDatabase>,
): Transaction[] {
  return database.transactions;
}

/** Riwayat transaksi satu cabang, terbaru di atas, termasuk yang sudah direfund. */
export function getTransactionHistory(
  database: ReturnType<typeof getDatabase>,
  branchId: string,
): TransactionHistoryRow[] {
  const employeeById = new Map(
    database.employees.map((employee) => [employee.id, employee]),
  );

  return database.transactions
    .filter((transaction) => transaction.branchId === branchId)
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
    .map((transaction) => ({
      id: transaction.id,
      invoiceNumber: transaction.invoiceNumber,
      createdAt: transaction.createdAt,
      cashierName: employeeById.get(transaction.cashierId)?.name ?? "Kasir",
      itemCount: transaction.items.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
      method: transaction.payment.method,
      total: transaction.total,
      isRefunded: isTransactionRefunded(transaction),
      refundedAt: transaction.refund?.at ?? null,
      refundedByName: transaction.refund?.byName ?? null,
      refundReason: transaction.refund?.reason ?? null,
    }));
}

function getDraftTotal(
  database: ReturnType<typeof getDatabase>,
  draft: CartDraft,
  branchId: string,
): number {
  const products = new Map(
    getProducts(database, branchId).map((product) => [product.id, product]),
  );
  const lines: CartLine[] = draft.items.flatMap((item) => {
    const product = products.get(item.productId);
    return product ? [{ product, quantity: item.quantity }] : [];
  });

  return calculateCartTotals(
    lines,
    draft.discountType,
    draft.discountValue,
  ).total;
}

export function getDraftSummaries(
  database: ReturnType<typeof getDatabase>,
  branchId: string,
): DraftSummary[] {
  const employeeById = new Map(
    database.employees.map((employee) => [employee.id, employee]),
  );

  return database.drafts
    .filter((draft) => draft.branchId === branchId)
    .map((draft) => ({
      draft,
      itemCount: draft.items.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
      total: getDraftTotal(database, draft, branchId),
      cashierName: employeeById.get(draft.cashierId)?.name ?? "Karyawan",
    }))
    .sort(
      (first, second) =>
        new Date(second.draft.updatedAt).getTime() -
        new Date(first.draft.updatedAt).getTime(),
    );
}

export function useCashierData(): CashierData {
  const database = useDatabase();
  const { employee, branch } = selectSession(database);

  return {
    products: getProducts(database, branch.id),
    categories: getCategories(database),
    salesEmployees: getSalesEmployees(database, branch.id),
    bankAccounts: getBankAccounts(database),
    enabledMethods: getEnabledMethods(database),
    drafts: getDraftSummaries(database, branch.id),
    transactions: getTransactionHistory(database, branch.id),
    settings: database.settings,
    branch,
    cashier: employee,
  };
}

/**
 * Nomor struk berikutnya baru dihitung setelah store ter-hydrate, supaya
 * tanggal hari ini tidak dievaluasi saat prerender (Cache Components).
 */
export function useNextInvoiceNumber(): string {
  const database = useHydratedDatabase();

  if (!database) return "";

  return getNextInvoiceNumber(database.transactions);
}

function buildReceiptView(
  database: ReturnType<typeof getDatabase>,
  transaction: Transaction,
): ReceiptViewData {
  const branch = database.branches.find(
    (item) => item.id === transaction.branchId,
  );
  const cashier = database.employees.find(
    (item) => item.id === transaction.cashierId,
  );
  const sales = transaction.salesEmployeeId
    ? database.employees.find(
        (item) => item.id === transaction.salesEmployeeId,
      )
    : undefined;
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
    cashierName: cashier?.name ?? "Karyawan",
    salesName: sales?.name ?? null,
    bankName: bank?.bankName ?? null,
    paperSize: database.settings.receipt.paperSize,
    footerText: database.settings.receipt.footerText,
  };
}

/** Membuat transaksi, mengurangi stok cabang, dan mencatat log dalam satu update. */
export function createTransaction(
  input: CreateTransactionInput,
): TransactionResult {
  let result: TransactionResult | undefined;

  updateDatabase((database) => {
    const { employee, branch } = selectSession(database);

    if (input.items.length === 0) {
      throw new Error("Keranjang masih kosong");
    }

    const productMap = new Map(
      getProducts(database, branch.id).map((product) => [
        product.id,
        product,
      ]),
    );

    const items = input.items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error("Ada produk yang sudah tidak tersedia");
      }

      if (item.quantity < 1) {
        throw new Error(`Qty ${product.name} tidak valid`);
      }

      if (item.quantity > product.stock) {
        throw new Error(
          `Stok ${product.name} tersisa ${product.stock}`,
        );
      }

      return {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        unitCost: product.costPrice,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity,
      };
    });

    const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);
    const discountAmount = calculateDiscountAmount(
      subtotal,
      input.discountType,
      input.discountValue,
    );
    const total = Math.max(0, subtotal - discountAmount);

    if (!database.settings.payment.enabledMethods.includes(input.paymentMethod)) {
      throw new Error(`Metode ${input.paymentMethod} sedang tidak aktif`);
    }

    if (input.paymentMethod === "Cash" && input.cashReceived < total) {
      throw new Error("Uang diterima kurang dari total");
    }

    if (
      input.paymentMethod === "Transfer" &&
      !database.settings.payment.bankAccounts.some(
        (account) => account.id === input.bankAccountId,
      )
    ) {
      throw new Error("Rekening transfer belum dipilih");
    }

    const salesEmployee = input.salesEmployeeId
      ? database.employees.find(
          (candidate) =>
            candidate.id === input.salesEmployeeId &&
            candidate.role === ROLES.SALES,
        )
      : undefined;

    const now = new Date();
    const invoiceNumber = getNextInvoiceNumber(database.transactions, now);
    const payment: TransactionPayment = { method: input.paymentMethod };

    if (input.paymentMethod === "Cash") {
      payment.cashReceived = input.cashReceived;
      payment.change = input.cashReceived - total;
    }

    if (input.paymentMethod === "Transfer" && input.bankAccountId) {
      payment.bankAccountId = input.bankAccountId;
    }

    const transaction: Transaction = {
      id: createId("trx"),
      invoiceNumber,
      branchId: branch.id,
      cashierId: employee.id,
      salesEmployeeId: salesEmployee?.id ?? null,
      items,
      subtotal,
      discount: {
        type: input.discountType,
        value: input.discountValue,
        amount: discountAmount,
      },
      total,
      payment,
      createdAt: now.toISOString(),
    };

    const updated = {
      ...database,
      transactions: [transaction, ...database.transactions],
      stocks: reduceStockLevels(database.stocks, branch.id, input.items),
    };

    result = {
      transaction,
      receipt: buildReceiptView(updated, transaction),
    };

    return appendActivity(updated, {
      action: "Membayar",
      detail: `Transaksi ${invoiceNumber} · ${formatRupiah(total)} · ${items.length} item`,
    });
  });

  if (!result) {
    throw new Error("Transaksi gagal disimpan");
  }

  return result;
}

/**
 * Membatalkan transaksi yang sudah dibayar: transaksi ditandai refund dan stok
 * cabang asal dikembalikan. Nominal refund mengikuti total yang dibayar.
 */
export function refundTransaction(
  input: RefundTransactionInput,
): RefundTransactionResult {
  let result: RefundTransactionResult | undefined;

  updateDatabase((database) => {
    const actor = database.employees.find(
      (employee) => employee.id === database.session.currentEmployeeId,
    );

    if (!actor) {
      throw new Error("Sesi pengguna tidak ditemukan");
    }

    if (!ROLE_PERMISSIONS[actor.role].canCancelTransaction) {
      throw new Error("Role Anda tidak boleh membatalkan transaksi");
    }

    const transaction = database.transactions.find(
      (item) => item.id === input.transactionId,
    );

    if (!transaction) {
      throw new Error("Transaksi tidak ditemukan");
    }

    if (isTransactionRefunded(transaction)) {
      throw new Error("Transaksi ini sudah direfund");
    }

    const reason = input.reason.trim();

    if (reason.length < 3) {
      throw new Error("Alasan refund minimal 3 karakter");
    }

    const refunded: Transaction = {
      ...transaction,
      refund: {
        at: new Date().toISOString(),
        byId: actor.id,
        byName: actor.name,
        reason,
        amount: transaction.total,
      },
    };

    const updated: ReturnType<typeof getDatabase> = {
      ...database,
      transactions: database.transactions.map((item) =>
        item.id === refunded.id ? refunded : item,
      ),
      stocks: restoreStockLevels(
        database.stocks,
        refunded.branchId,
        refunded.items,
      ),
    };

    result = { transaction: refunded, refundedAmount: refunded.total };

    return appendActivity(updated, {
      action: "Refund",
      detail: `Refund ${refunded.invoiceNumber} · ${formatRupiah(refunded.total)} · ${reason}`,
    });
  });

  if (!result) {
    throw new Error("Refund gagal diproses");
  }

  return result;
}

export function saveDraft(input: SaveDraftInput): CartDraft {
  let created: CartDraft | undefined;

  updateDatabase((database) => {
    const { employee, branch } = selectSession(database);

    if (input.items.length === 0) {
      throw new Error("Keranjang masih kosong");
    }

    const productMap = new Map(
      getProducts(database, branch.id).map((product) => [
        product.id,
        product,
      ]),
    );

    input.items.forEach((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Ada produk yang sudah tidak tersedia");
      if (item.quantity > product.stock) {
        throw new Error(`Stok ${product.name} tersisa ${product.stock}`);
      }
    });

    const now = new Date();
    const totalQuantity = input.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    const label = `Draft ${formatDateTimeShort(now)} · ${totalQuantity} item`;
    const draft: CartDraft = {
      id: createId("draft"),
      label,
      branchId: branch.id,
      cashierId: employee.id,
      salesEmployeeId: input.salesEmployeeId,
      items: input.items,
      discountType: input.discountType,
      discountValue: input.discountValue,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    created = draft;

    return appendActivity(
      { ...database, drafts: [draft, ...database.drafts] },
      { action: "Membuat", detail: label },
    );
  });

  if (!created) {
    throw new Error("Draft gagal disimpan");
  }

  return created;
}

export function takeDraft(draftId: string): CartDraft | null {
  let taken: CartDraft | undefined;

  updateDatabase((database) => {
    const draft = database.drafts.find((item) => item.id === draftId);
    if (!draft) return database;

    taken = draft;

    return appendActivity(
      {
        ...database,
        drafts: database.drafts.filter((item) => item.id !== draftId),
      },
      { action: "Membuka", detail: draft.label },
    );
  });

  return taken ?? null;
}

export function deleteDraft(draftId: string): void {
  updateDatabase((database) => {
    const draft = database.drafts.find((item) => item.id === draftId);
    if (!draft) return database;

    return appendActivity(
      {
        ...database,
        drafts: database.drafts.filter((item) => item.id !== draftId),
      },
      { action: "Menghapus", detail: draft.label },
    );
  });
}

export function logCartCancellation(invoiceNumber: string): void {
  recordActivity({
    action: "Membatalkan",
    detail: `Keranjang ${invoiceNumber} dibatalkan`,
  });
}
