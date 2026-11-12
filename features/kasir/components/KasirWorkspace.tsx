"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { CartPanel } from "@/features/kasir/components/CartPanel";
import { DraftListModal } from "@/features/kasir/components/DraftListModal";
import { ProductCatalog } from "@/features/kasir/components/ProductCatalog";
import { ReceiptModal } from "@/features/kasir/components/ReceiptModal";
import { RefundDialog } from "@/features/kasir/components/RefundDialog";
import { SalesOrderPickerModal } from "@/features/kasir/components/SalesOrderPickerModal";
import { TransactionHistoryModal } from "@/features/kasir/components/TransactionHistoryModal";
import {
  calculateCartTotals,
  filterProducts,
} from "@/features/kasir/data/kasir-calculations";
import {
  calculateSalesCharges,
  DEFAULT_TAX_ENABLED,
} from "@/lib/store/charges";
import {
  buildReceiptView,
  createTransaction,
  deleteDraft,
  loadTransactionHistory,
  logCartCancellation,
  refundTransaction,
  saveDraft,
  takeDraft,
  useCashierData,
  useNextInvoiceNumber,
} from "@/features/kasir/data/kasir-repository";
import { usePermissions } from "@/features/session/data/session-repository";
import { getDatabase } from "@/lib/store/store";
import { formatRupiah } from "@/lib/format";
import type {
  SalesOrder,
  ShippingMethod,
  Transaction,
} from "@/lib/store/types";
import type {
  CartItemInput,
  CartLine,
  KasirProduct,
  ReceiptViewData,
  TransactionHistoryRow,
} from "@/features/kasir/types";
import type { PaymentMethod } from "@/types";

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Terjadi kesalahan, silakan coba lagi";
}

export function KasirWorkspace() {
  const data = useCashierData();
  const invoiceNumber = useNextInvoiceNumber();
  const permissions = usePermissions();
  const { showToast } = useToast();

  const [items, setItems] = useState<CartItemInput[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    null,
  );
  const [salesEmployeeId, setSalesEmployeeId] = useState("");
  const [salesOrderId, setSalesOrderId] = useState<string | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const handledOrderRef = useRef<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [taxEnabled, setTaxEnabled] = useState(DEFAULT_TAX_ENABLED);
  const [taxRate, setTaxRate] = useState(0);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | "">("");
  const [shippingCost, setShippingCost] = useState(0);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<
    TransactionHistoryRow[] | null
  >(null);
  const [historyTransactions, setHistoryTransactions] = useState<
    Transaction[]
  >([]);
  const [refundTarget, setRefundTarget] =
    useState<TransactionHistoryRow | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptViewData | null>(null);
  const [paying, setPaying] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const products = data.products;
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const lines: CartLine[] = items.flatMap((item) => {
    const product = productMap.get(item.productId);
    return product
      ? [
          {
            product,
            quantity: item.quantity,
            priceType: item.priceType ?? "retail",
            discountType: item.discountType ?? "nominal",
            discountValue: item.discountValue ?? 0,
          },
        ]
      : [];
  });

  const canEditDiscount = permissions.canApplyDiscount;
  const totals = calculateCartTotals(lines);
  // Tarif pesanan bisa berbeda dari pengaturan bila pesanan dibuat lebih dulu.
  const activeTaxRate = taxRate > 0 ? taxRate : data.settings.taxRate;
  const charges = calculateSalesCharges({
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    taxEnabled,
    taxRate: activeTaxRate,
    shippingMethod,
    shippingCost,
  });
  const pendingOrders = data.salesOrders.filter(
    (order) =>
      order.branchId === data.branch.id &&
      (order.status === "Menunggu bayar" || order.status === "Belum sinkron"),
  );

  const filteredProducts = useMemo(
    () => filterProducts(products, search, activeCategoryId),
    [products, search, activeCategoryId],
  );

  const activeMethod: PaymentMethod = data.enabledMethods.includes(method)
    ? method
    : (data.enabledMethods[0] ?? "Cash");
  const activeSalesId = data.salesEmployees.some(
    (employee) => employee.id === salesEmployeeId,
  )
    ? salesEmployeeId
    : "";
  const activeBankId = data.bankAccounts.some(
    (account) => account.id === selectedBankId,
  )
    ? selectedBankId
    : (data.bankAccounts[0]?.id ?? "");

  const cashSufficient =
    activeMethod !== "Cash" || cashReceived >= charges.total;
  const transferReady = activeMethod !== "Transfer" || activeBankId !== "";
  const canPay =
    totals.itemCount > 0 &&
    data.enabledMethods.length > 0 &&
    shippingMethod !== "" &&
    (shippingMethod !== "paid" || shippingCost > 0) &&
    cashSufficient &&
    transferReady;

  function handleAddProduct(product: KasirProduct) {
    if (product.stock <= 0) {
      showToast(`Stok ${product.name} habis`, "error");
      return;
    }

    const currentQuantity =
      items.find((item) => item.productId === product.id)?.quantity ?? 0;

    if (currentQuantity >= product.stock) {
      showToast(`Stok ${product.name} hanya ${product.stock}`, "error");
      return;
    }

    setItems((current) => {
      const existing = current.find(
        (item) => item.productId === product.id,
      );

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          quantity: 1,
          priceType: "retail",
          discountType: "nominal",
          discountValue: 0,
        },
      ];
    });
    showToast(`${product.name} ditambahkan`, "success");
  }

  function handleQtyChange(productId: string, delta: number) {
    const line = lines.find((item) => item.product.id === productId);
    if (!line) return;

    if (delta > 0 && line.quantity >= line.product.stock) {
      showToast(`Stok ${line.product.name} hanya ${line.product.stock}`, "error");
      return;
    }

    if (delta < 0 && line.quantity <= 1) return;

    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + delta }
          : item,
      ),
    );
  }

  function handleRemoveItem(productId: string) {
    const line = lines.find((item) => item.product.id === productId);
    setItems((current) =>
      current.filter((item) => item.productId !== productId),
    );
    showToast(
      line ? `${line.product.name} dihapus` : "Produk dihapus",
      "info",
    );
  }

  function handleLineChange(
    productId: string,
    patch: Partial<
      Pick<CartLine, "priceType" | "discountType" | "discountValue">
    >,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, ...patch } : item,
      ),
    );
  }

  function resetCart() {
    setItems([]);
    setSalesEmployeeId("");
    setSalesOrderId(null);
    setCashReceived(0);
    setTaxEnabled(DEFAULT_TAX_ENABLED);
    setTaxRate(0);
    setShippingMethod("");
    setShippingCost(0);
  }

  async function handleSaveDraft() {
    if (draftSaving) return;

    if (items.length === 0) {
      showToast("Keranjang masih kosong", "error");
      return;
    }

    setDraftSaving(true);

    try {
      await saveDraft({
        items,
        discountType: "nominal",
        discountValue: 0,
        salesEmployeeId: activeSalesId || null,
      });
      resetCart();
      showToast("Draft berhasil disimpan", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDraftSaving(false);
    }
  }

  async function handleOpenDraft(draftId: string) {
    if (draftSaving) return;

    const summary = data.drafts.find((item) => item.draft.id === draftId);

    if (!summary) {
      showToast("Draft tidak ditemukan", "error");
      return;
    }

    const draft = summary.draft;
    const restored: CartItemInput[] = [];
    let adjusted = false;

    draft.items.forEach((item) => {
      const product = productMap.get(item.productId);

      if (!product || product.stock <= 0) {
        adjusted = true;
        return;
      }

      const quantity = Math.min(item.quantity, product.stock);
      if (quantity < item.quantity) adjusted = true;
      if (quantity > 0) {
        restored.push({
          productId: item.productId,
          quantity,
          priceType: "retail",
          discountType: "nominal",
          discountValue: 0,
        });
      }
    });

    if (restored.length === 0) {
      showToast("Produk pada draft sudah tidak tersedia", "error");
      return;
    }

    setDraftSaving(true);

    try {
      // Draft baru dihapus dari daftar setelah isinya berhasil dimuat.
      await takeDraft(draftId);
      setDraftsOpen(false);
      setItems(restored);
      setSalesOrderId(null);
      setSalesEmployeeId(draft.salesEmployeeId ?? "");
      // Draft tidak menyimpan PPN/ongkir; jangan bawa nilai keranjang sebelumnya.
      setTaxEnabled(DEFAULT_TAX_ENABLED);
      setTaxRate(0);
      setShippingMethod("");
      setShippingCost(0);
      showToast(
        adjusted
          ? "Draft dibuka, sebagian qty disesuaikan dengan stok"
          : "Draft dibuka",
        adjusted ? "info" : "success",
      );
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDraftSaving(false);
    }
  }

  async function handleDeleteDraft(draftId: string) {
    if (draftSaving) return;

    setDraftSaving(true);

    try {
      await deleteDraft(draftId);
      showToast("Draft dihapus", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDraftSaving(false);
    }
  }

  async function handleOpenHistory() {
    setHistoryOpen(true);

    try {
      const history = await loadTransactionHistory(data.branch.id);
      setHistoryRows(history.rows);
      setHistoryTransactions(history.transactions);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  }

  function handleViewReceipt(row: TransactionHistoryRow) {
    const database = getDatabase();
    const transaction =
      historyTransactions.find((item) => item.id === row.id) ??
      database.transactions.find((item) => item.id === row.id);

    if (!transaction) {
      showToast("Transaksi tidak ditemukan", "error");
      return;
    }

    setReceipt(buildReceiptView(database, transaction));
  }

  function handleSelectOrder(order: SalesOrder) {
    const restored: CartItemInput[] = [];

    for (const item of order.items) {
      const product = productMap.get(item.productId);

      if (!product) {
        showToast(`Produk ${item.productName} sudah tidak tersedia`, "error");
        return;
      }

      if (item.quantity > product.stock) {
        showToast(`Stok ${product.name} tersisa ${product.stock}`, "error");
        return;
      }

      restored.push({
        productId: item.productId,
        quantity: item.quantity,
        priceType: item.priceType ?? "retail",
        discountType: item.discountType ?? "nominal",
        discountValue: item.discountValue ?? 0,
      });
    }

    if (restored.length === 0) {
      showToast("Pesanan tidak punya item", "error");
      return;
    }

    setItems(restored);
    setSalesEmployeeId(order.salesEmployeeId);
    setSalesOrderId(order.id);
    setOrdersOpen(false);
    setCashReceived(0);
    // PPN dan ongkir pesanan terbawa otomatis; kasir masih bisa menyesuaikan.
    setTaxEnabled(order.taxEnabled);
    setTaxRate(order.taxRate);
    setShippingMethod(order.shippingMethod);
    setShippingCost(order.shippingCost);
    showToast(`Pesanan ${order.orderNumber} dimuat ke kasir`, "success");
  }

  // Halaman Pesanan mengirim ?order=<id> agar pesanan langsung masuk keranjang.
  useEffect(() => {
    if (handledOrderRef.current) return;

    const orderId = new URLSearchParams(window.location.search).get("order");
    if (!orderId) return;

    const order = data.salesOrders.find((item) => item.id === orderId);
    if (!order) return;

    handledOrderRef.current = orderId;
    handleSelectOrder(order);
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.salesOrders]);

  function handleCancelCart() {
    if (totals.itemCount === 0) {
      showToast("Keranjang sudah kosong", "info");
      return;
    }

    setCancelOpen(true);
  }

  function confirmCancelCart() {
    setCancelOpen(false);
    resetCart();
    logCartCancellation(invoiceNumber || "keranjang baru");
    showToast("Keranjang dibatalkan", "success");
  }

  async function handleRefund(reason: string) {
    if (!refundTarget || refunding) return;

    setRefunding(true);

    try {
      const result = await refundTransaction({
        transactionId: refundTarget.id,
        reason,
      });
      setRefundTarget(null);
      setHistoryRows(null);
      showToast(
        `Transaksi ${result.transaction.invoiceNumber} direfund · ${formatRupiah(result.refundedAmount)}`,
        "success",
      );
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setRefunding(false);
    }
  }

  async function handlePay() {
    if (paying) return;

    if (totals.itemCount === 0) {
      showToast("Keranjang masih kosong", "error");
      return;
    }

    if (!shippingMethod) {
      showToast("Pilih pengiriman dulu (ambil di toko, ongkir, atau gratis)", "error");
      return;
    }

    if (shippingMethod === "paid" && shippingCost <= 0) {
      showToast("Nominal ongkir harus lebih dari 0", "error");
      return;
    }

    if (!cashSufficient) {
      showToast("Uang diterima kurang dari total", "error");
      return;
    }

    setPaying(true);

    try {
      const result = await createTransaction({
        items,
        paymentMethod: activeMethod,
        cashReceived,
        bankAccountId:
          activeMethod === "Transfer" ? activeBankId : undefined,
        salesEmployeeId: activeSalesId || null,
        salesOrderId: salesOrderId ?? undefined,
        taxEnabled,
        taxRate: activeTaxRate,
        shippingMethod: shippingMethod as ShippingMethod,
        shippingCost,
      });

      setReceipt(result.receipt);
      resetCart();
      showToast(
        `Transaksi ${result.transaction.invoiceNumber} berhasil`,
        "success",
      );
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Kasir"
        subtitle={`${data.branch.name} · Shift pagi dibuka 08:00`}
        actions={
          <>
            <Chip tone="success" dot>
              Online · Tersinkron
            </Chip>
            <Chip tone="neutral">Printer &amp; laci siap</Chip>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOrdersOpen(true)}
            >
              Pesanan Sales ({pendingOrders.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenHistory}
            >
              Riwayat Transaksi
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-5 p-4 sm:p-5 lg:px-7 lg:py-5">
        <ProductCatalog
          products={filteredProducts}
          categories={data.categories}
          search={search}
          activeCategoryId={activeCategoryId}
          onSearchChange={setSearch}
          onCategoryChange={setActiveCategoryId}
          onAddProduct={handleAddProduct}
          onScan={() =>
            showToast("Scanner barcode belum terhubung", "info")
          }
        />

        <CartPanel
          invoiceNumber={invoiceNumber || "Menyiapkan nomor…"}
          lines={lines}
          totals={totals}
          salesEmployees={data.salesEmployees}
          salesEmployeeId={activeSalesId}
          onSalesChange={setSalesEmployeeId}
          canEditDiscount={canEditDiscount}
          onLineChange={handleLineChange}
          methods={data.enabledMethods}
          method={activeMethod}
          onMethodChange={setMethod}
          cashReceived={cashReceived}
          onCashReceivedChange={setCashReceived}
          bankAccounts={data.bankAccounts}
          selectedBankId={activeBankId}
          onBankChange={setSelectedBankId}
          canPay={canPay && !paying}
          canCancel={permissions.canCancelTransaction}
          draftCount={data.drafts.length}
          onOpenDrafts={() => setDraftsOpen(true)}
          onSaveDraft={handleSaveDraft}
          onCancel={handleCancelCart}
          onPay={handlePay}
          onQtyChange={handleQtyChange}
          onRemoveItem={handleRemoveItem}
          taxEnabled={taxEnabled}
          taxRate={activeTaxRate}
          onTaxEnabledChange={setTaxEnabled}
          shippingMethod={shippingMethod}
          shippingCost={shippingCost}
          onShippingMethodChange={setShippingMethod}
          onShippingCostChange={setShippingCost}
          charges={charges}
        />
      </div>

      <DraftListModal
        open={draftsOpen}
        drafts={data.drafts}
        onClose={() => setDraftsOpen(false)}
        onOpenDraft={handleOpenDraft}
        onDeleteDraft={handleDeleteDraft}
      />

      <SalesOrderPickerModal
        open={ordersOpen}
        orders={pendingOrders}
        employees={data.employees}
        branchName={data.branch.name}
        onSelect={handleSelectOrder}
        onClose={() => setOrdersOpen(false)}
      />

      <TransactionHistoryModal
        open={historyOpen}
        transactions={historyRows ?? data.transactions}
        canRefund={permissions.canCancelTransaction}
        onClose={() => setHistoryOpen(false)}
        onRequestRefund={setRefundTarget}
        onViewReceipt={handleViewReceipt}
      />

      {refundTarget ? (
        <RefundDialog
          row={refundTarget}
          branchName={data.branch.name}
          onClose={() => setRefundTarget(null)}
          onConfirm={handleRefund}
        />
      ) : null}

      <ConfirmDialog
        open={cancelOpen}
        title="Batalkan pesanan?"
        description="Semua item di keranjang akan dihapus. Draft yang sudah disimpan tidak terpengaruh."
        confirmLabel="Ya, batalkan"
        onClose={() => setCancelOpen(false)}
        onConfirm={confirmCancelCart}
      />

      <ReceiptModal
        receipt={receipt}
        onClose={() => setReceipt(null)}
      />
    </>
  );
}
