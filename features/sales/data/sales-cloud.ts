import {
  bootstrapSalesAction,
  fetchSalesSnapshotAction,
} from "@/features/sales/cloud-actions";
import {
  getDatabase,
  hasStoredDatabase,
  updateDatabase,
} from "@/lib/store/store";
import type { AppDatabase } from "@/lib/store/types";
import type {
  SalesBootstrapPayload,
  SalesSnapshot,
} from "@/lib/cloud/sales-types";
import { syncProductStockFromCloud } from "@/features/produk/data/produk-cloud";

let inFlight: Promise<{ bootstrapped: boolean }> | null = null;

function buildBootstrapPayload(database: AppDatabase): SalesBootstrapPayload {
  return {
    branches: database.branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      is_active: branch.isActive,
    })),
    employees: database.employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      phone: employee.phone,
      initials: employee.initials,
      role: employee.role,
      branch_id: employee.branchId,
      is_active: employee.isActive,
    })),
    transactions: database.transactions.map((transaction) => ({
      id: transaction.id,
      invoice_number: transaction.invoiceNumber,
      branch_id: transaction.branchId,
      cashier_id: transaction.cashierId,
      sales_employee_id: transaction.salesEmployeeId,
      subtotal: transaction.subtotal,
      discount_type: transaction.discount.type,
      discount_value: transaction.discount.value,
      discount_amount: transaction.discount.amount,
      total: transaction.total,
      payment_method: transaction.payment.method,
      cash_received: transaction.payment.cashReceived ?? null,
      change_amount: transaction.payment.change ?? null,
      bank_account_id: transaction.payment.bankAccountId ?? null,
      refunded_at: transaction.refund?.at ?? null,
      refunded_by_id: transaction.refund?.byId ?? null,
      refunded_by_name: transaction.refund?.byName ?? null,
      refund_reason: transaction.refund?.reason ?? null,
      refund_amount: transaction.refund?.amount ?? null,
      created_at: transaction.createdAt,
      items: transaction.items.map((item) => ({
        product_id: item.productId,
        product_name: item.productName,
        unit_price: item.unitPrice,
        unit_cost: item.unitCost ?? null,
        quantity: item.quantity,
        line_total: item.lineTotal,
      })),
    })),
    sales_orders: database.salesOrders.map((order) => ({
      id: order.id,
      order_number: order.orderNumber,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      branch_id: order.branchId,
      sales_employee_id: order.salesEmployeeId,
      total: order.total,
      status: order.status,
      paid_at: order.paidAt ?? null,
      stock_applied: order.stockApplied,
      note: order.note,
      created_at: order.createdAt,
      items: order.items.map((item) => ({
        product_id: item.productId,
        product_name: item.productName,
        unit_price: item.unitPrice,
        unit_cost: item.unitCost ?? null,
        quantity: item.quantity,
      })),
    })),
    drafts: database.drafts.map((draft) => ({
      id: draft.id,
      label: draft.label,
      branch_id: draft.branchId,
      cashier_id: draft.cashierId,
      sales_employee_id: draft.salesEmployeeId,
      discount_type: draft.discountType,
      discount_value: draft.discountValue,
      created_at: draft.createdAt,
      updated_at: draft.updatedAt,
      items: draft.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
    })),
  };
}

function applySnapshot(snapshot: SalesSnapshot): void {
  updateDatabase((database) => ({
    ...database,
    transactions: snapshot.transactions,
    salesOrders: snapshot.salesOrders,
    drafts: snapshot.drafts,
  }));
}

interface SyncOptions {
  canBootstrap?: boolean;
  force?: boolean;
}

export function syncSalesFromCloud(
  options: SyncOptions = {},
): Promise<{ bootstrapped: boolean }> {
  if (inFlight) {
    if (!options.force) return inFlight;

    return inFlight
      .catch(() => undefined)
      .then(() => syncSalesFromCloud({ ...options, force: false }));
  }

  inFlight = (async () => {
    let snapshot = await fetchSalesSnapshotAction();
    let bootstrapped = false;

    if (snapshot.isEmpty) {
      const database = getDatabase();
      const stored = hasStoredDatabase();
      const hasLocalSales =
        database.transactions.length > 0 ||
        database.salesOrders.length > 0 ||
        database.drafts.length > 0;

      if (options.canBootstrap && stored && hasLocalSales) {
        // Pastikan produk/karyawan/cabang sudah ada sebelum item penjualan.
        await syncProductStockFromCloud({ force: true });

        const result = await bootstrapSalesAction(
          buildBootstrapPayload(database),
        );

        if (!result.ok) throw new Error(result.error);

        bootstrapped = result.bootstrapped;
        snapshot = await fetchSalesSnapshotAction();
      } else if (!stored) {
        applySnapshot(snapshot);
      }
    }

    if (!snapshot.isEmpty) applySnapshot(snapshot);

    return { bootstrapped };
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
