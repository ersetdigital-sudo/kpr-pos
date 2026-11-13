import { formatPercent, formatRupiah } from "@/lib/format";
import { terbilangRupiah } from "@/lib/terbilang";
import { DocumentLetterhead } from "@/features/documents/components/DocumentLetterhead";
import { formatDocumentDate } from "@/features/documents/data/print-helpers";
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
      className={
        strong
          ? "flex items-baseline justify-between gap-3 border-t border-black pt-1.5 text-[12px] font-bold"
          : "flex items-baseline justify-between gap-3 text-[10.5px]"
      }
    >
      <span>{label}</span>
      <span className="whitespace-nowrap tabular-nums">{value}</span>
    </div>
  );
}

export function InvoiceDocument({ data }: InvoiceDocumentProps) {
  const hasPaymentBox = Boolean(
    data.letterhead.bankName ||
      data.letterhead.bankAccountNumber ||
      data.letterhead.bankAccountHolder,
  );
  const shippingLabel =
    data.shippingMethod === "free"
      ? "Gratis"
      : formatRupiah(data.shippingCost);

  return (
    <article className="document-paper document-paper--a4 bg-white text-black">
      <DocumentLetterhead letterhead={data.letterhead} variant="a4" />

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="m-0 text-[26px] leading-none font-extrabold tracking-[0.22em]">
          INVOICE
        </h2>
        <span className="border border-black px-3 py-1 text-[10px] font-bold tracking-[0.18em]">
          {data.badge}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1.25fr_1fr] gap-6">
        <section>
          <p className="m-0 text-[9px] font-semibold tracking-[0.16em] text-neutral-500 uppercase">
            Kepada
          </p>
          <p className="mt-1 mb-0 text-[12px] font-bold">{data.party.name}</p>
          {data.party.address ? (
            <p className="mt-0.5 mb-0 text-[10.5px] leading-snug whitespace-pre-line">
              {data.party.address}
            </p>
          ) : null}
          {data.party.phone ? (
            <p className="mt-0.5 mb-0 text-[10.5px]">Telp. {data.party.phone}</p>
          ) : null}
          {data.party.npwp ? (
            <p className="mt-0.5 mb-0 text-[10.5px]">NPWP {data.party.npwp}</p>
          ) : null}
        </section>

        <dl className="m-0 grid grid-cols-[96px_1fr] gap-x-3 gap-y-1 text-[10.5px]">
          <dt className="text-neutral-500">No. Invoice</dt>
          <dd className="m-0 font-semibold">{data.number}</dd>
          <dt className="text-neutral-500">Tanggal</dt>
          <dd className="m-0">{formatDocumentDate(data.date)}</dd>
          {data.orderNumber ? (
            <>
              <dt className="text-neutral-500">No. Pesanan</dt>
              <dd className="m-0">{data.orderNumber}</dd>
            </>
          ) : null}
          {data.dueDate ? (
            <>
              <dt className="text-neutral-500">Jatuh Tempo</dt>
              <dd className="m-0 font-semibold">
                {formatDocumentDate(data.dueDate)}
              </dd>
            </>
          ) : null}
          <dt className="text-neutral-500">Sales</dt>
          <dd className="m-0">{data.salesName}</dd>
          <dt className="text-neutral-500">Cabang</dt>
          <dd className="m-0">{data.branchName}</dd>
        </dl>
      </div>

      <table className="mt-5 w-full table-fixed border-collapse text-[10.5px]">
        <colgroup>
          <col className="w-[7%]" />
          <col className="w-[16%]" />
          <col className="w-[37%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
          <col className="w-[10%]" />
          <col className="w-[13%]" />
        </colgroup>
        <thead>
          <tr className="border-y border-black bg-neutral-100 text-left text-[9.5px] font-bold tracking-[0.08em] uppercase">
            <th className="px-1.5 py-1.5 text-center">No</th>
            <th className="px-1.5 py-1.5">Kode</th>
            <th className="px-1.5 py-1.5">Nama Barang</th>
            <th className="px-1.5 py-1.5 text-right">Qty</th>
            <th className="px-1.5 py-1.5">Satuan</th>
            <th className="px-1.5 py-1.5 text-right">Harga</th>
            <th className="px-1.5 py-1.5 text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={`${item.code}-${index}`} className="border-b border-neutral-300">
              <td className="px-1.5 py-1.5 text-center">{index + 1}</td>
              <td className="px-1.5 py-1.5 font-mono text-[9.5px]">{item.code}</td>
              <td className="px-1.5 py-1.5 break-words">{item.name}</td>
              <td className="px-1.5 py-1.5 text-right tabular-nums">
                {item.quantity}
              </td>
              <td className="px-1.5 py-1.5">{item.unit}</td>
              <td className="px-1.5 py-1.5 text-right tabular-nums">
                {formatRupiah(item.unitPrice)}
              </td>
              <td className="px-1.5 py-1.5 text-right font-semibold tabular-nums">
                {formatRupiah(item.gross)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 grid grid-cols-[1fr_270px] items-start gap-6">
        <section className="border border-neutral-300 px-3 py-2.5">
          <p className="m-0 text-[9px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">
            Terbilang
          </p>
          <p className="mt-1 mb-0 text-[11px] leading-snug font-semibold italic">
            {terbilangRupiah(data.total)}
          </p>
        </section>

        <div className="flex flex-col gap-1.5">
          <SummaryRow label="Subtotal" value={formatRupiah(data.subtotal)} />
          {data.discount > 0 ? (
            <SummaryRow label="Potongan" value={`- ${formatRupiah(data.discount)}`} />
          ) : null}
          {data.taxEnabled ? (
            <SummaryRow
              label="DPP"
              value={formatRupiah(data.subtotal - data.discount)}
            />
          ) : null}
          {data.taxEnabled ? (
            <SummaryRow
              label={`PPN ${formatPercent(data.taxRate)}`}
              value={formatRupiah(data.taxAmount)}
            />
          ) : null}
          {data.shippingMethod !== "pickup" ? (
            <SummaryRow label="Ongkos kirim" value={shippingLabel} />
          ) : null}
          <SummaryRow label="TOTAL" value={formatRupiah(data.total)} strong />
          {data.paidAmount > 0 ? (
            <SummaryRow
              label="Uang muka / dibayar"
              value={`- ${formatRupiah(data.paidAmount)}`}
            />
          ) : null}
          <SummaryRow
            label="Sisa tagihan"
            value={formatRupiah(data.remainingAmount)}
            strong
          />
        </div>
      </div>

      <div
        className={
          hasPaymentBox
            ? "mt-4 grid grid-cols-2 gap-4"
            : "mt-4 grid grid-cols-1 gap-4"
        }
      >
        {hasPaymentBox ? (
          <section className="border border-neutral-300 px-3 py-2.5">
            <p className="m-0 text-[9px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">
              Pembayaran
            </p>
            <p className="mt-1 mb-0 text-[10.5px]">Silakan transfer ke:</p>
            {data.letterhead.bankName ? (
              <p className="mt-1 mb-0 text-[11px] font-bold">
                {data.letterhead.bankName}
              </p>
            ) : null}
            {data.letterhead.bankAccountNumber ? (
              <p className="mt-0.5 mb-0 font-mono text-[12px] font-semibold tracking-wide">
                {data.letterhead.bankAccountNumber}
              </p>
            ) : null}
            {data.letterhead.bankAccountHolder ? (
              <p className="mt-0.5 mb-0 text-[10.5px]">
                a.n. {data.letterhead.bankAccountHolder}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="border border-neutral-300 px-3 py-2.5">
          <p className="m-0 text-[9px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">
            Syarat &amp; Catatan
          </p>
          <p className="mt-1 mb-0 text-[10.5px] leading-snug">{data.termsLine}</p>
        </section>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-6 text-center text-[10px]">
        {[
          { label: "Dibuat oleh", name: data.salesName === "-" ? "" : data.salesName },
          { label: "Mengetahui", name: "" },
          { label: "Penerima", name: "" },
        ].map((signature) => (
          <div key={signature.label}>
            <div className="flex h-14 items-end justify-center pb-1 font-semibold">
              {signature.name}
            </div>
            <div className="border-t border-black pt-1">{signature.label}</div>
          </div>
        ))}
      </div>
    </article>
  );
}
