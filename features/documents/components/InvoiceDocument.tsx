import { formatPercent, formatRupiah } from "@/lib/format";
import { formatDecimal } from "@/lib/units";
import { resolveDiscountedUnitPricing } from "@/lib/document-pricing";
import { terbilangRupiah } from "@/lib/terbilang";
import { cn } from "@/lib/cn";
import {
  DocumentBox,
  DocumentBoxTitle,
  DocumentInfoList,
} from "@/features/documents/components/DocumentBox";
import { DocumentHeaderA4 } from "@/features/documents/components/DocumentHeader";
import {
  DocumentSignatures,
  type DocumentSignatureItem,
} from "@/features/documents/components/DocumentSignatures";
import {
  INVOICE_ROWS_PER_PAGE,
  formatDocumentDate,
  paginateInvoiceItems,
} from "@/features/documents/data/print-helpers";
import type { InvoiceViewData } from "@/features/documents/types";

interface InvoiceDocumentProps {
  data: InvoiceViewData;
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-2 border-b border-neutral-300 py-1 text-[9.5px]",
        strong && "font-bold",
      )}
    >
      <span>{label}</span>
      <span className="whitespace-nowrap tabular-nums">{value}</span>
    </div>
  );
}

export function InvoiceDocument({ data }: InvoiceDocumentProps) {
  const hasLength = data.items.some(
    (item) => item.totalLengthM !== undefined,
  );
  const hasWeight = data.items.some(
    (item) => item.totalWeightKg !== undefined,
  );
  const nameWidth =
    hasLength && hasWeight ? "20%" : hasLength || hasWeight ? "28%" : "36%";
  const pages = paginateInvoiceItems(data.items);
  const totalPages = pages.length;
  const hasBank = Boolean(
    data.letterhead.bankName ||
      data.letterhead.bankAccountNumber ||
      data.letterhead.bankAccountHolder,
  );

  const infoItems = [
    { label: "No. Invoice", value: data.number },
    { label: "Tanggal", value: formatDocumentDate(data.date) },
    ...(data.orderNumber
      ? [{ label: "No. Pesanan", value: data.orderNumber }]
      : []),
    ...(data.dueDate
      ? [
          {
            label: "Jatuh tempo",
            value: formatDocumentDate(data.dueDate),
          },
        ]
      : []),
    { label: "Sales", value: data.salesName },
    { label: "Cabang", value: data.branchName },
  ];

  const signatureItems: readonly DocumentSignatureItem[] = [
    {
      title: "Dibuat oleh",
      name: data.salesName === "-" ? undefined : data.salesName,
    },
    { title: "Mengetahui" },
    { title: "Penerima" },
  ];

  return (
    <>
      {pages.map((pageItems, pageIndex) => {
        const isLast = pageIndex === totalPages - 1;

        return (
          <section
            key={pageIndex}
            className="document-paper document-paper--a4 document-page mb-4 flex flex-col bg-white text-black print:mb-0"
          >
            <DocumentHeaderA4
              letterhead={data.letterhead}
              title="INVOICE"
              badge={data.badge}
            />

            <div className="mt-3 grid grid-cols-[1.15fr_0.85fr] gap-3">
              <DocumentBox>
                <DocumentBoxTitle>KEPADA</DocumentBoxTitle>
                <p className="mt-1 mb-0 text-[11px] font-bold">
                  {data.party.name}
                </p>
                {data.party.address.trim() ? (
                  <p className="mt-0.5 mb-0 text-[9.5px] leading-snug whitespace-pre-line">
                    Alamat: {data.party.address}
                  </p>
                ) : null}
                {data.party.phone.trim() ? (
                  <p className="mt-0.5 mb-0 text-[9.5px]">
                    Telp: {data.party.phone}
                  </p>
                ) : null}
                {data.party.npwp.trim() ? (
                  <p className="mt-0.5 mb-0 text-[9.5px]">
                    NPWP: {data.party.npwp}
                  </p>
                ) : null}
              </DocumentBox>

              <DocumentBox>
                <DocumentInfoList items={infoItems} />
              </DocumentBox>
            </div>

            <div className="mt-3 flex min-h-[320px] flex-col border border-black">
              <table className="w-full table-fixed border-collapse text-[9.5px]">
                <colgroup>
                  <col className="w-[6%]" />
                  <col className="w-[16%]" />
                  <col style={{ width: nameWidth }} />
                  <col className="w-[8%]" />
                  <col className="w-[9%]" />
                  {hasLength ? <col className="w-[8%]" /> : null}
                  {hasWeight ? <col className="w-[8%]" /> : null}
                  <col className="w-[11%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-black bg-neutral-100 text-left text-[8.5px] font-bold tracking-[0.06em] uppercase">
                    <th className="px-1.5 py-1.5 text-center">No</th>
                    <th className="px-1.5 py-1.5">Kode</th>
                    <th className="px-1.5 py-1.5">Nama barang</th>
                    <th className="px-1.5 py-1.5 text-right">Qty</th>
                    <th className="px-1.5 py-1.5">Sat.</th>
                    {hasLength ? (
                      <th className="px-1.5 py-1.5 text-right">
                        Panjang (m)
                      </th>
                    ) : null}
                    {hasWeight ? (
                      <th className="px-1.5 py-1.5 text-right">Berat (kg)</th>
                    ) : null}
                    <th className="px-1.5 py-1.5 text-right">Harga</th>
                    <th className="px-1.5 py-1.5 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, index) => {
                    const linePricing = resolveDiscountedUnitPricing({
                      unitPrice: item.unitPrice,
                      quantity: item.quantity,
                      discountAmount: item.discount,
                      discountType: item.discountType,
                      discountValue: item.discountValue,
                    });
                    const rowNumber =
                      pageIndex * INVOICE_ROWS_PER_PAGE + index + 1;

                    return (
                      <tr
                        key={`${item.code}-${rowNumber}`}
                        className="break-inside-avoid border-b border-neutral-300 align-top"
                      >
                        <td className="px-1.5 py-1 text-center">{rowNumber}</td>
                        <td className="px-1.5 py-1 font-mono text-[8.5px]">
                          {item.code}
                        </td>
                        <td className="px-1.5 py-1 break-words">
                          <div>{item.name}</div>
                          {item.discount > 0 ? (
                            <div className="mt-0.5 text-[8px] leading-tight italic text-neutral-500">
                              Harga awal {formatRupiah(item.unitPrice)}, diskon{" "}
                              {formatRupiah(linePricing.discountPerUnit)} /{" "}
                              {item.unit}
                              {item.discountType === "percent" &&
                              item.discountValue
                                ? ` (${formatPercent(item.discountValue)})`
                                : ""}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-1.5 py-1 text-right tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-1.5 py-1">{item.unit}</td>
                        {hasLength ? (
                          <td className="px-1.5 py-1 text-right tabular-nums">
                            {item.totalLengthM !== undefined
                              ? formatDecimal(item.totalLengthM)
                              : "-"}
                          </td>
                        ) : null}
                        {hasWeight ? (
                          <td className="px-1.5 py-1 text-right tabular-nums">
                            {item.totalWeightKg !== undefined
                              ? formatDecimal(item.totalWeightKg)
                              : "-"}
                          </td>
                        ) : null}
                        <td className="px-1.5 py-1 text-right tabular-nums">
                          {formatRupiah(linePricing.netUnitPrice)}
                        </td>
                        <td className="px-1.5 py-1 text-right font-semibold tabular-nums">
                          {formatRupiah(item.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex-1" />
            </div>

            {isLast ? (
              <>
                <div className="mt-3 grid grid-cols-[1fr_268px] items-start gap-3">
                  <div className="flex flex-col gap-2">
                    <DocumentBox>
                      <DocumentBoxTitle>TERBILANG</DocumentBoxTitle>
                      <p className="mt-1 mb-0 text-[10px] leading-snug font-semibold italic">
                        {terbilangRupiah(data.total)}
                      </p>
                    </DocumentBox>

                    <DocumentBox>
                      <DocumentBoxTitle>PEMBAYARAN</DocumentBoxTitle>
                      {hasBank ? (
                        <>
                          <p className="mt-1 mb-0 text-[9px]">
                            Silakan transfer ke:
                          </p>
                          {data.letterhead.bankName ? (
                            <p className="mt-0.5 mb-0 text-[10px] font-bold">
                              {data.letterhead.bankName}
                            </p>
                          ) : null}
                          {data.letterhead.bankAccountNumber ? (
                            <p className="mt-0.5 mb-0 text-[12px] font-bold tracking-wide">
                              {data.letterhead.bankAccountNumber}
                            </p>
                          ) : null}
                          {data.letterhead.bankAccountHolder ? (
                            <p className="mt-0.5 mb-0 text-[9px]">
                              a.n. {data.letterhead.bankAccountHolder}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <p className="mt-1 mb-0 text-[9px]">
                          Pembayaran sesuai kesepakatan.
                        </p>
                      )}
                    </DocumentBox>

                    <DocumentBox>
                      <DocumentBoxTitle>SYARAT DAN CATATAN</DocumentBoxTitle>
                      <div className="mt-1 flex flex-col gap-0.5 text-[8.5px] leading-snug">
                        {data.termsLines.map((line, index) => (
                          <p
                            key={`${index}-${line}`}
                            className="m-0 whitespace-pre-line"
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </DocumentBox>
                  </div>

                  <DocumentBox className="px-2 py-1">
                    <SummaryRow
                      label="Harga jual"
                      value={formatRupiah(data.subtotal)}
                    />
                    {data.extraDiscount > 0 ? (
                      <SummaryRow
                        label="Potongan"
                        value={`- ${formatRupiah(data.extraDiscount)}`}
                      />
                    ) : null}
                    {data.taxEnabled ? (
                      <SummaryRow
                        label="Dasar pengenaan pajak"
                        value={formatRupiah(
                          data.subtotal - data.extraDiscount,
                        )}
                      />
                    ) : null}
                    {data.taxEnabled ? (
                      <SummaryRow
                        label={`PPN ${formatPercent(data.taxRate)}`}
                        value={formatRupiah(data.taxAmount)}
                      />
                    ) : null}
                    {data.shippingMethod !== "pickup" ? (
                      <SummaryRow
                        label="Ongkos kirim"
                        value={
                          data.shippingMethod === "free"
                            ? "Gratis"
                            : formatRupiah(data.shippingCost)
                        }
                      />
                    ) : null}

                    <div className="my-1 flex items-baseline justify-between gap-2 bg-neutral-200 px-2 py-1.5 text-[12px] font-bold">
                      <span>TOTAL</span>
                      <span className="whitespace-nowrap tabular-nums">
                        {formatRupiah(data.total)}
                      </span>
                    </div>

                    {data.paidAmount > 0 ? (
                      <SummaryRow
                        label="Uang muka / dibayar"
                        value={`- ${formatRupiah(data.paidAmount)}`}
                      />
                    ) : null}
                    <div className="flex items-baseline justify-between gap-2 pt-1 text-[10px] font-bold">
                      <span>SISA TAGIHAN</span>
                      <span className="whitespace-nowrap tabular-nums">
                        {formatRupiah(data.remainingAmount)}
                      </span>
                    </div>
                  </DocumentBox>
                </div>

                <div className="mt-auto pt-3">
                  <DocumentSignatures items={signatureItems} />
                </div>
              </>
            ) : (
              <div className="flex-1" />
            )}

            <div className="mt-2 text-[8px] text-neutral-500">
              Dicetak dari KPR POS.
            </div>
          </section>
        );
      })}
    </>
  );
}
