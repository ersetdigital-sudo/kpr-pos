"use client";

import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import {
  calculateLineDiscount,
  calculateLineTotal,
  getLineUnitPrice,
} from "@/features/kasir/data/kasir-calculations";
import { PaymentSection } from "@/features/kasir/components/PaymentSection";
import { formatRupiah } from "@/lib/format";
import type {
  BankAccount,
  DiscountType,
  Employee,
  PriceType,
} from "@/lib/store/types";
import type {
  CartLine,
  CartTotals,
} from "@/features/kasir/types";
import type { PaymentMethod } from "@/types";

interface CartPanelProps {
  invoiceNumber: string;
  lines: readonly CartLine[];
  totals: CartTotals;
  salesEmployees: readonly Employee[];
  salesEmployeeId: string;
  onSalesChange: (employeeId: string) => void;
  canEditDiscount: boolean;
  onLineChange: (
    productId: string,
    patch: Partial<
      Pick<CartLine, "priceType" | "discountType" | "discountValue">
    >,
  ) => void;
  methods: readonly PaymentMethod[];
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  cashReceived: number;
  onCashReceivedChange: (value: number) => void;
  bankAccounts: readonly BankAccount[];
  selectedBankId: string;
  onBankChange: (accountId: string) => void;
  canPay: boolean;
  canCancel: boolean;
  draftCount: number;
  onOpenDrafts: () => void;
  onSaveDraft: () => void;
  onCancel: () => void;
  onPay: () => void;
  onQtyChange: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
}

export function CartPanel({
  invoiceNumber,
  lines,
  totals,
  salesEmployees,
  salesEmployeeId,
  onSalesChange,
  canEditDiscount,
  onLineChange,
  methods,
  method,
  onMethodChange,
  cashReceived,
  onCashReceivedChange,
  bankAccounts,
  selectedBankId,
  onBankChange,
  canPay,
  canCancel,
  draftCount,
  onOpenDrafts,
  onSaveDraft,
  onCancel,
  onPay,
  onQtyChange,
  onRemoveItem,
}: CartPanelProps) {
  return (
    <aside
      aria-label="Keranjang"
      className="flex min-w-0 flex-[2_1_340px] flex-col rounded-panel border border-line bg-surface"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-[18px]">
        <h2 className="m-0 text-panel-title font-bold text-ink">
          Pesanan Baru
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-label text-ink-muted">{invoiceNumber}</span>
          <button
            type="button"
            onClick={onOpenDrafts}
            className="h-8 cursor-pointer rounded-control border border-line-strong bg-surface px-2 font-sans text-meta font-semibold text-ink"
          >
            Draft ({draftCount})
          </button>
        </div>
      </div>

      <div className="border-b border-line px-5 py-3.5">
        <Field label="Sales yang menangani (untuk bonus)">
          <Select
            value={salesEmployeeId}
            onChange={(event) => onSalesChange(event.target.value)}
          >
            <option value="">Tanpa sales</option>
            {salesEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-col px-5 py-1.5">
        {lines.length === 0 ? (
          <div className="my-2 rounded-control border border-dashed border-line-strong bg-canvas px-4 py-6 text-center">
            <p className="m-0 text-body font-semibold text-ink">
              Keranjang masih kosong
            </p>
            <p className="mt-1 mb-0 text-meta text-ink-muted">
              Klik produk untuk menambahkan.
            </p>
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={line.product.id}
              className="border-b border-line-faint py-3"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-body font-semibold text-ink">
                    {line.product.name}
                  </div>
                  <div className="text-meta text-ink-muted">
                    {formatRupiah(getLineUnitPrice(line))}
                    {line.priceType === "wholesale" ? " · Grosir" : " · Ecer"}
                    <span aria-hidden="true"> · </span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(line.product.id)}
                      className="cursor-pointer border-0 bg-transparent p-0 font-sans text-meta text-danger-ink underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`Kurangi ${line.product.name}`}
                    disabled={line.quantity <= 1}
                    onClick={() => onQtyChange(line.product.id, -1)}
                    className="h-8 w-8 cursor-pointer rounded-control border border-line-strong bg-surface font-sans text-[16px] text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="min-w-[22px] text-center text-body font-bold text-ink">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Tambah ${line.product.name}`}
                    disabled={line.quantity >= line.product.stock}
                    onClick={() => onQtyChange(line.product.id, 1)}
                    className="h-8 w-8 cursor-pointer rounded-control border border-line-strong bg-surface font-sans text-[16px] text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <div className="w-[92px] text-right text-body font-bold text-ink">
                  {formatRupiah(calculateLineTotal(line))}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <select
                  aria-label={`Jenis harga ${line.product.name}`}
                  value={line.priceType}
                  onChange={(event) =>
                    onLineChange(line.product.id, {
                      priceType: event.target.value as PriceType,
                    })
                  }
                  className="h-8 cursor-pointer rounded-control border border-line-strong bg-surface px-1.5 font-sans text-meta text-ink"
                >
                  <option value="retail">Ecer</option>
                  <option
                    value="wholesale"
                    disabled={line.product.wholesalePrice <= 0}
                  >
                    Grosir
                  </option>
                </select>

                {canEditDiscount ? (
                  <>
                    <select
                      aria-label={`Tipe diskon ${line.product.name}`}
                      value={line.discountType}
                      onChange={(event) =>
                        onLineChange(line.product.id, {
                          discountType: event.target.value as DiscountType,
                          discountValue: 0,
                        })
                      }
                      className="h-8 cursor-pointer rounded-control border border-line-strong bg-surface px-1.5 font-sans text-meta text-ink"
                    >
                      <option value="nominal">Rp/pcs</option>
                      <option value="percent">%</option>
                    </select>
                    {line.discountType === "nominal" ? (
                      <CurrencyInput
                        aria-label={`Diskon ${line.product.name}`}
                        prefix={false}
                        value={line.discountValue}
                        onValueChange={(value) =>
                          onLineChange(line.product.id, {
                            discountValue: value,
                          })
                        }
                        placeholder="0"
                        className="h-8 w-[88px] px-2 text-label font-semibold"
                      />
                    ) : (
                      <input
                        aria-label={`Diskon persen ${line.product.name}`}
                        type="number"
                        min={0}
                        max={100}
                        value={line.discountValue === 0 ? "" : line.discountValue}
                        placeholder="0"
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          const safeValue = Number.isFinite(next)
                            ? Math.max(0, next)
                            : 0;
                          onLineChange(line.product.id, {
                            discountValue: Math.min(100, safeValue),
                          });
                        }}
                        className="h-8 w-[70px] rounded-control border border-line-strong bg-surface px-2 text-right font-sans text-label font-semibold text-ink"
                      />
                    )}
                    {calculateLineDiscount(line) > 0 ? (
                      <span className="text-meta font-semibold text-danger-ink">
                        - {formatRupiah(calculateLineDiscount(line))}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2 px-5 py-3.5 text-body">
        <div className="flex justify-between">
          <span className="text-ink-muted">Subtotal</span>
          <span className="text-ink">{formatRupiah(totals.subtotal)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-ink-muted">Total diskon item</span>
          <span className="text-ink">
            - {formatRupiah(totals.discountAmount)}
          </span>
        </div>

        <div className="flex items-baseline justify-between border-t border-dashed border-line-strong pt-2">
          <span className="font-bold text-ink">Total</span>
          <span className="text-stat font-extrabold text-ink">
            {formatRupiah(totals.total)}
          </span>
        </div>
      </div>

      <PaymentSection
        total={totals.total}
        methods={methods}
        method={method}
        onMethodChange={onMethodChange}
        cashReceived={cashReceived}
        onCashReceivedChange={onCashReceivedChange}
        bankAccounts={bankAccounts}
        selectedBankId={selectedBankId}
        onBankChange={onBankChange}
      />

      <div className="mt-auto flex flex-col gap-2 px-5 pb-5">
        <Button
          variant="primary"
          size="lg"
          onClick={onPay}
          disabled={!canPay}
          className="h-[54px] rounded-card text-card-title disabled:cursor-not-allowed disabled:opacity-50"
        >
          Bayar &amp; Cetak Struk
        </Button>

        {canCancel ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={onSaveDraft}
              disabled={totals.itemCount === 0}
              className="flex-1 rounded-control-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              Simpan Draft
            </Button>
            <Button
              variant="dangerOutline"
              size="lg"
              onClick={onCancel}
              className="flex-1 rounded-control-lg"
            >
              Batalkan
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="lg"
            onClick={onSaveDraft}
            disabled={totals.itemCount === 0}
            className="w-full rounded-control-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            Simpan Draft
          </Button>
        )}

        <p className="mt-1 mb-0 text-center text-meta text-ink-muted">
          Laci kasir terbuka otomatis setelah struk tercetak
        </p>
      </div>
    </aside>
  );
}
