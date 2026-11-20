import { formatPercent, formatRupiah } from "@/lib/format";
import { formatDecimal } from "@/lib/units";
import { resolveDiscountedUnitPricing } from "@/lib/document-pricing";
import { terbilangRupiah } from "@/lib/terbilang";
import {
  DocumentBox,
  DocumentInfoList,
} from "@/features/documents/components/DocumentBox";
import { DocumentCompanyIdentity } from "@/features/documents/components/DocumentHeader";
import {
  DocumentSignatures,
  type DocumentSignatureItem,
} from "@/features/documents/components/DocumentSignatures";
import {
  INVOICE_DOT_ROWS_PER_PAGE,
  formatDocumentDate,
  paginateInvoiceItems,
} from "@/features/documents/data/print-helpers";
import type { InvoiceViewData } from "@/features/documents/types";

interface InvoiceDotMatrixDocumentProps {
  data: InvoiceViewData;
}

function SummaryLine({
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
      className={`flex items-baseline justify-between gap-2 ${
        strong ? "font-bold" : ""
      }`}
    >
      <span>{label}</span>
      <span className="whitespace-nowrap">{value}</span>
    </div>
  );
}

/** Invoice hitam-putih Courier untuk printer dot matrix 9,5 x 11 inci. */
export function InvoiceDotMatrixDocument({
  data,
}: InvoiceDotMatrixDocumentProps) {
  const hasLength = data.items.some((item) => item.totalLengthM !== undefined);
  const hasWeight = data.items.some((item) => item.totalWeightKg !== undefined);
  const nameWidth =
    hasLength && hasWeight ? "20%" : hasLength || hasWeight ? "27%" : "34%";
  const pages = paginateInvoiceItems(data.items, INVOICE_DOT_ROWS_PER_PAGE);
  const totalPages = pages.length;
  const hasBank = Boolean(
    data.letterhead.bankName ||
    data.letterhead.bankAccountNumber ||
    data.letterhead.bankAccountHolder,
  );

  const metaItems = [
    { label: "Tanggal", value: formatDocumentDate(data.date) },
    { label: "No. Invoice", value: data.number },
    ...(data.orderNumber
      ? [{ label: "No. Pesanan", value: data.orderNumber }]
      : []),
    ...(data.dueDate
      ? [{ label: "Jatuh tempo", value: formatDocumentDate(data.dueDate) }]
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
            className="document-paper document-paper--dot document-page mb-4 flex flex-col bg-white text-black print:mb-0"
          >
            <div className="flex items-start justify-between gap-4 border-b border-black pb-1">
              <DocumentCompanyIdentity
                letterhead={data.letterhead}
                variant="dot"
              />
              <DocumentInfoList
                items={metaItems}
                variant="dot"
                className="w-[62mm] shrink-0"
              />
            </div>

            <div className="mt-1 flex items-center justify-center gap-3 text-[13px] font-bold tracking-[0.45em] uppercase">
              <span>INVOICE</span>
              {data.badge ? (
                <span className="border border-black px-2 text-[9px] tracking-[0.15em]">
                  {data.badge}
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex flex-col gap-0.5 text-[8.5px]">
              <div>
                <span className="font-bold">Kepada:</span> {data.party.name}
              </div>
              {data.party.address.trim() ? (
                <div className="whitespace-pre-line">
                  <span className="font-bold">Alamat:</span>{" "}
                  {data.party.address}
                </div>
              ) : null}
              {data.party.phone.trim() ? (
                <div>
                  <span className="font-bold">Telp:</span> {data.party.phone}
                </div>
              ) : null}
            </div>

            <div className="mt-1 flex min-h-[250px] flex-1 flex-col border border-black">
              <table className="w-full table-fixed border-collapse text-[8.5px]">
                <colgroup>
                  <col className="w-[5%]" />
                  <col className="w-[15%]" />
                  <col style={{ width: nameWidth }} />
                  <col className="w-[7%]" />
                  <col className="w-[7%]" />
                  {hasLength ? <col className="w-[8%]" /> : null}
                  {hasWeight ? <col className="w-[8%]" /> : null}
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead>
                  <tr className="text-[7.5px] uppercase">
                    <th className="border-b border-black px-1 py-[2px] text-center">
                      No
                    </th>
                    <th className="border-b border-black px-1 py-[2px] text-left">
                      Kode
                    </th>
                    <th className="border-b border-black px-1 py-[2px] text-left">
                      Nama barang
                    </th>
                    <th className="border-b border-black px-1 py-[2px] text-right">
                      Qty
                    </th>
                    <th className="border-b border-black px-1 py-[2px] text-left">
                      Sat.
                    </th>
                    {hasLength ? (
                      <th className="border-b border-black px-1 py-[2px] text-right">
                        Panjang (m)
                      </th>
                    ) : null}
                    {hasWeight ? (
                      <th className="border-b border-black px-1 py-[2px] text-right">
                        Berat (kg)
                      </th>
                    ) : null}
                    <th className="border-b border-black px-1 py-[2px] text-right">
                      Harga
                    </th>
                    <th className="border-b border-black px-1 py-[2px] text-right">
                      Jumlah
                    </th>
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
                      pageIndex * INVOICE_DOT_ROWS_PER_PAGE + index + 1;

                    return (
                      <tr
                        key={`${item.code}-${rowNumber}`}
                        className="break-inside-avoid border-b border-black align-top"
                      >
                        <td className="px-1 py-[2px] text-center">
                          {rowNumber}
                        </td>
                        <td className="px-1 py-[2px] break-all">{item.code}</td>
                        <td className="px-1 py-[2px] break-words">
                          <div>{item.name}</div>
                          {item.discount > 0 ? (
                            <div className="text-[7px] leading-tight">
                              Hrg awal {formatRupiah(item.unitPrice)}, disk{" "}
                              {formatRupiah(linePricing.discountPerUnit)}/
                              {item.unit}
                              {item.discountType === "percent" &&
                              item.discountValue
                                ? ` (${formatPercent(item.discountValue)})`
                                : ""}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-1 py-[2px] text-right">
                          {item.quantity}
                        </td>
                        <td className="px-1 py-[2px]">{item.unit}</td>
                        {hasLength ? (
                          <td className="px-1 py-[2px] text-right">
                            {item.totalLengthM !== undefined
                              ? formatDecimal(item.totalLengthM)
                              : "-"}
                          </td>
                        ) : null}
                        {hasWeight ? (
                          <td className="px-1 py-[2px] text-right">
                            {item.totalWeightKg !== undefined
                              ? formatDecimal(item.totalWeightKg)
                              : "-"}
                          </td>
                        ) : null}
                        <td className="px-1 py-[2px] text-right">
                          {formatRupiah(linePricing.netUnitPrice)}
                        </td>
                        <td className="px-1 py-[2px] text-right font-bold">
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
                <div className="mt-1 grid grid-cols-[1fr_62mm] items-start gap-2 text-[8px]">
                  <div className="flex flex-col gap-1">
                    <DocumentBox className="px-1.5 py-1" padded={false}>
                      <span className="font-bold">Terbilang:</span>{" "}
                      <span className="italic">
                        {terbilangRupiah(data.total)}
                      </span>
                    </DocumentBox>
                    <DocumentBox className="px-1.5 py-1" padded={false}>
                      <div className="font-bold">Pembayaran</div>
                      {hasBank ? (
                        <div>
                          {[
                            data.letterhead.bankName,
                            data.letterhead.bankAccountNumber,
                            data.letterhead.bankAccountHolder
                              ? `a.n. ${data.letterhead.bankAccountHolder}`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" | ")}
                        </div>
                      ) : (
                        <div>Pembayaran sesuai kesepakatan.</div>
                      )}
                    </DocumentBox>
                    <DocumentBox className="px-1.5 py-1" padded={false}>
                      <div className="font-bold">Syarat dan catatan</div>
                      {data.termsLines.map((line, index) => (
                        <div
                          key={`${index}-${line}`}
                          className="whitespace-pre-line"
                        >
                          {line}
                        </div>
                      ))}
                    </DocumentBox>
                  </div>

                  <DocumentBox className="px-1.5 py-1" padded={false}>
                    <SummaryLine
                      label="Harga jual"
                      value={formatRupiah(data.subtotal)}
                    />
                    {data.extraDiscount > 0 ? (
                      <SummaryLine
                        label="Potongan"
                        value={`- ${formatRupiah(data.extraDiscount)}`}
                      />
                    ) : null}
                    {data.taxEnabled ? (
                      <SummaryLine
                        label="DPP"
                        value={formatRupiah(data.subtotal - data.extraDiscount)}
                      />
                    ) : null}
                    {data.taxEnabled ? (
                      <SummaryLine
                        label={`PPN ${formatPercent(data.taxRate)}`}
                        value={formatRupiah(data.taxAmount)}
                      />
                    ) : null}
                    {data.shippingMethod !== "pickup" ? (
                      <SummaryLine
                        label="Ongkos kirim"
                        value={
                          data.shippingMethod === "free"
                            ? "Gratis"
                            : formatRupiah(data.shippingCost)
                        }
                      />
                    ) : null}
                    <div className="my-0.5 border-y border-black py-0.5 text-[10px]">
                      <SummaryLine
                        label="TOTAL"
                        value={formatRupiah(data.total)}
                        strong
                      />
                    </div>
                    {data.paidAmount > 0 ? (
                      <SummaryLine
                        label="Dibayar"
                        value={`- ${formatRupiah(data.paidAmount)}`}
                      />
                    ) : null}
                    <SummaryLine
                      label="SISA TAGIHAN"
                      value={formatRupiah(data.remainingAmount)}
                      strong
                    />
                  </DocumentBox>
                </div>

                <div className="mt-1">
                  <DocumentSignatures items={signatureItems} variant="dot" />
                </div>
              </>
            ) : (
              <div className="flex-1" />
            )}

            <div className="mt-1 grid grid-cols-3 gap-2 border-t border-black pt-0.5 text-[7.5px]">
              <span>Dicetak dari KPR POS</span>
              <span>Sales: {data.salesName}</span>
              <span className="text-right">
                Hal: {pageIndex + 1}/{totalPages}
              </span>
            </div>
          </section>
        );
      })}
    </>
  );
}
