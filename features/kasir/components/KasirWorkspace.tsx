"use client";

import { useMemo, useState } from "react";
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
import { TransactionHistoryModal } from "@/features/kasir/components/TransactionHistoryModal";
import {
  calculateCartTotals,
  filterProducts,
} from "@/features/kasir/data/kasir-calculations";
import {
  createTransaction,
  deleteDraft,
  logCartCancellation,
  refundTransaction,
  saveDraft,
  takeDraft,
  useCashierData,
  useNextInvoiceNumber,
} from "@/features/kasir/data/kasir-repository";
import { usePermissions } from "@/features/session/data/session-repository";
import { formatRupiah } from "@/lib/format";
import type { DiscountType } from "@/lib/store/types";
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
  const [discountType, setDiscountType] = useState<DiscountType>("nominal");
  const [discountValue, setDiscountValue] = useState(0);
  const [salesEmployeeId, setSalesEmployeeId] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
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
    return product ? [{ product, quantity: item.quantity }] : [];
  });

  const canEditDiscount = permissions.canApplyDiscount;
  const activeDiscountType: DiscountType = canEditDiscount
    ? discountType
    : "nominal";
  const activeDiscountValue = canEditDiscount ? discountValue : 0;
  const totals = calculateCartTotals(
    lines,
    activeDiscountType,
    activeDiscountValue,
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
    activeMethod !== "Cash" || cashReceived >= totals.total;
  const transferReady = activeMethod !== "Transfer" || activeBankId !== "";
  const canPay =
    totals.itemCount > 0 &&
    data.enabledMethods.length > 0 &&
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

      return [...current, { productId: product.id, quantity: 1 }];
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

  function handleDiscountTypeChange(nextType: DiscountType) {
    setDiscountType(nextType);
    setDiscountValue(0);
  }

  function resetCart() {
    setItems([]);
    setDiscountType("nominal");
    setDiscountValue(0);
    setSalesEmployeeId("");
    setCashReceived(0);
  }

  function handleSaveDraft() {
    if (items.length === 0) {
      showToast("Keranjang masih kosong", "error");
      return;
    }

    try {
      saveDraft({
        items,
        discountType: activeDiscountType,
        discountValue: activeDiscountValue,
        salesEmployeeId: activeSalesId || null,
      });
      resetCart();
      showToast("Draft berhasil disimpan", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  }

  function handleOpenDraft(draftId: string) {
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
        restored.push({ productId: item.productId, quantity });
      }
    });

    if (restored.length === 0) {
      showToast("Produk pada draft sudah tidak tersedia", "error");
      return;
    }

    // Draft baru dihapus dari daftar setelah isinya berhasil dimuat.
    takeDraft(draftId);
    setDraftsOpen(false);
    setItems(restored);
    setDiscountType(draft.discountType);
    setDiscountValue(draft.discountValue);
    setSalesEmployeeId(draft.salesEmployeeId ?? "");
    showToast(
      adjusted
        ? "Draft dibuka, sebagian qty disesuaikan dengan stok"
        : "Draft dibuka",
      adjusted ? "info" : "success",
    );
  }

  function handleDeleteDraft(draftId: string) {
    deleteDraft(draftId);
    showToast("Draft dihapus", "success");
  }

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

    if (!cashSufficient) {
      showToast("Uang diterima kurang dari total", "error");
      return;
    }

    setPaying(true);

    try {
      const result = await createTransaction({
        items,
        discountType: activeDiscountType,
        discountValue: activeDiscountValue,
        paymentMethod: activeMethod,
        cashReceived,
        bankAccountId:
          activeMethod === "Transfer" ? activeBankId : undefined,
        salesEmployeeId: activeSalesId || null,
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
              onClick={() => setHistoryOpen(true)}
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
          discountType={activeDiscountType}
          discountValue={activeDiscountValue}
          onDiscountTypeChange={handleDiscountTypeChange}
          onDiscountValueChange={setDiscountValue}
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
        />
      </div>

      <DraftListModal
        open={draftsOpen}
        drafts={data.drafts}
        onClose={() => setDraftsOpen(false)}
        onOpenDraft={handleOpenDraft}
        onDeleteDraft={handleDeleteDraft}
      />

      <TransactionHistoryModal
        open={historyOpen}
        transactions={data.transactions}
        canRefund={permissions.canCancelTransaction}
        onClose={() => setHistoryOpen(false)}
        onRequestRefund={setRefundTarget}
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
