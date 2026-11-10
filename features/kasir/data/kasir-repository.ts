"use client";

import { ROLES } from "@/constants/roles";
import { recordActivity } from "@/lib/store/activity";
import {
  getDatabase,
  useDatabase,
  useHydratedDatabase,
} from "@/lib/store/store";
import type {
  BankAccount,
  CartDraft,
  Employee,
  Transaction,
} from "@/lib/store/types";
import { formatDateTimeShort, formatRupiah } from "@/lib/format";
import { isTransactionRefunded } from "@/lib/store/transactions";
import {
  calculateCartTotals,
  calculateItemDiscount,
  getNextInvoiceNumber,
} from "@/features/kasir/data/kasir-calculations";
import { selectSession } from "@/features/session/data/session-repository";
import {
  createTransactionAction,
  deleteDraftAction,
  fetchTransactionHistoryAction,
  refundTransactionAction,
  saveDraftAction,
  takeDraftAction,
} from "@/features/sales/cloud-actions";
import {
  syncAppFromCloud,
  trackCloudWrite,
} from "@/features/sync/data/app-sync";
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
        wholesalePrice: product.wholesalePrice ?? 0,
        costPrice: product.costPrice,
        stock: stock?.quantity ?? 0,
        categoryId: product.categoryId,
        categoryName:
          categoryById.get(product.categoryId)?.name ?? "Tanpa kategori",
        imageUrl: product.imageUrl,
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

/**
 * Riwayat transaksi cabang aktif langsung dari server (bukan snapshot harian),
 * dipakai saat modal Riwayat Transaksi dibuka.
 */
export async function loadTransactionHistory(
  branchId: string,
): Promise<{
  rows: TransactionHistoryRow[];
  transactions: Transaction[];
}> {
  const transactions = await fetchTransactionHistoryAction(branchId);

  return {
    rows: getTransactionHistory({ ...getDatabase(), transactions }, branchId),
    transactions,
  };
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
    return product
      ? [
          {
            product,
            quantity: item.quantity,
            priceType: "retail",
            discountType: "nominal",
            discountValue: 0,
          },
        ]
      : [];
  });

  return calculateCartTotals(lines).total;
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
    salesOrders: database.salesOrders,
    employees: database.employees,
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

export function buildReceiptView(
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
  const order = database.salesOrders.find(
    (item) => item.transactionId === transaction.id,
  );

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
    customerName: order?.customerName ?? null,
    note: order?.note ?? null,
    paperSize: database.settings.receipt.paperSize,
    footerText: database.settings.receipt.footerText,
  };
}

async function refreshAfterSale(): Promise<void> {
  try {
    await syncAppFromCloud({ force: true });
  } catch (error) {
    console.error("Sinkronisasi setelah transaksi gagal:", error);
  }
}

/**
 * Membuat transaksi. Nomor, stok, dan item dihitung atomik di Supabase;
 * cache lokal diperbarui lewat sinkronisasi snapshot.
 */
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<TransactionResult> {
  const database = getDatabase();
  const { employee, branch } = selectSession(database);

  if (input.items.length === 0) {
    throw new Error("Keranjang masih kosong");
  }

  const productMap = new Map(
    getProducts(database, branch.id).map((product) => [product.id, product]),
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
      throw new Error(`Stok ${product.name} tersisa ${product.stock}`);
    }

    const priceType = item.priceType ?? "retail";
    const discountType = item.discountType ?? "nominal";
    const discountValue = Math.max(0, item.discountValue ?? 0);
    const unitPrice =
      priceType === "wholesale" && product.wholesalePrice > 0
        ? product.wholesalePrice
        : product.price;
    const gross = unitPrice * item.quantity;
    const discountAmount = calculateItemDiscount(
      gross,
      discountType,
      discountValue,
      item.quantity,
    );

    return {
      productId: product.id,
      quantity: item.quantity,
      priceType,
      discountType,
      discountValue,
      unitPrice,
      discountAmount,
      lineTotal: gross - discountAmount,
    };
  });

  const subtotal = items.reduce(
    (total, item) => total + item.lineTotal + item.discountAmount,
    0,
  );
  const discountAmount = items.reduce(
    (total, item) => total + item.discountAmount,
    0,
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

  const result = await trackCloudWrite(() =>
    createTransactionAction({
      branchId: branch.id,
      cashierId: employee.id,
      salesEmployeeId: salesEmployee?.id ?? null,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        priceType: item.priceType,
        discountType: item.discountType,
        discountValue: item.discountValue,
      })),
      paymentMethod: input.paymentMethod,
      cashReceived: input.cashReceived,
      bankAccountId: input.bankAccountId,
      salesOrderId: input.salesOrderId,
    }),
  );

  if (!result.ok) throw new Error(result.error);

  const transaction = result.data;
  await refreshAfterSale();

  recordActivity({
    action: "Membayar",
    detail: `Transaksi ${transaction.invoiceNumber} · ${formatRupiah(transaction.total)} · ${transaction.items.length} item`,
  });

  return {
    transaction,
    receipt: buildReceiptView(getDatabase(), transaction),
  };
}

/**
 * Membatalkan transaksi yang sudah dibayar: transaksi ditandai refund dan stok
 * cabang asal dikembalikan secara atomik di Supabase.
 */
export async function refundTransaction(
  input: RefundTransactionInput,
): Promise<RefundTransactionResult> {
  const database = getDatabase();
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

  const result = await trackCloudWrite(() =>
    refundTransactionAction(input.transactionId, reason),
  );
  if (!result.ok) throw new Error(result.error);

  await refreshAfterSale();

  recordActivity({
    action: "Refund",
    detail: `Refund ${transaction.invoiceNumber} · ${formatRupiah(transaction.total)} · ${reason}`,
  });

  return {
    transaction: result.data,
    refundedAmount: result.data.total,
  };
}

export async function saveDraft(input: SaveDraftInput): Promise<CartDraft> {
  const database = getDatabase();
  const { employee, branch } = selectSession(database);

  if (input.items.length === 0) {
    throw new Error("Keranjang masih kosong");
  }

  const productMap = new Map(
    getProducts(database, branch.id).map((product) => [product.id, product]),
  );

  input.items.forEach((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error("Ada produk yang sudah tidak tersedia");
    if (item.quantity > product.stock) {
      throw new Error(`Stok ${product.name} tersisa ${product.stock}`);
    }
  });

  const totalQuantity = input.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const label = `Draft ${formatDateTimeShort(new Date())} · ${totalQuantity} item`;

  const result = await trackCloudWrite(() =>
    saveDraftAction({
      branchId: branch.id,
      cashierId: employee.id,
      salesEmployeeId: input.salesEmployeeId,
      label,
      discountType: input.discountType,
      discountValue: input.discountValue,
      items: input.items,
    }),
  );

  if (!result.ok) throw new Error(result.error);

  await syncAppFromCloud({ force: true }).catch(() => undefined);

  recordActivity({ action: "Membuat", detail: label });

  return result.data;
}

export async function takeDraft(draftId: string): Promise<CartDraft | null> {
  const result = await trackCloudWrite(() => takeDraftAction(draftId));

  if (!result.ok) {
    if (result.error === "Draft tidak ditemukan") return null;
    throw new Error(result.error);
  }

  await syncAppFromCloud({ force: true }).catch(() => undefined);
  recordActivity({ action: "Membuka", detail: result.data.label });

  return result.data;
}

export async function deleteDraft(draftId: string): Promise<void> {
  const draft = getDatabase().drafts.find((item) => item.id === draftId);
  const result = await trackCloudWrite(() => deleteDraftAction(draftId));

  if (!result.ok) throw new Error(result.error);

  await syncAppFromCloud({ force: true }).catch(() => undefined);
  recordActivity({
    action: "Menghapus",
    detail: draft?.label ?? draftId,
  });
}

export function logCartCancellation(invoiceNumber: string): void {
  recordActivity({
    action: "Membatalkan",
    detail: `Keranjang ${invoiceNumber} dibatalkan`,
  });
}
