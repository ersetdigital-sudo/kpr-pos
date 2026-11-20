import { formatDecimal } from "@/lib/units";
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
  formatDocumentDate,
  paginateDeliveryNote,
} from "@/features/documents/data/print-helpers";
import type { DeliveryNoteViewData } from "@/features/documents/types";

interface DeliveryNoteA4DocumentProps {
  data: DeliveryNoteViewData;
}

export function DeliveryNoteA4Document({ data }: DeliveryNoteA4DocumentProps) {
  const pages = paginateDeliveryNote(data.items, "a4");
  const hasLength = data.items.some(
    (item) => item.totalLengthM !== undefined,
  );
  const hasWeight = data.items.some(
    (item) => item.totalWeightKg !== undefined,
  );
  const nameWidth =
    hasLength && hasWeight ? "20%" : hasLength || hasWeight ? "28%" : "36%";

  const infoItems = [
    { label: "Tanggal", value: formatDocumentDate(data.date) },
    { label: "No. SJ", value: data.number },
    { label: "No. Order", value: data.orderNumber },
    { label: "No. Polisi", value: data.vehicleNumber || "-" },
    { label: "Supir", value: data.driverName || "-" },
  ];

  const signatureItems: readonly DocumentSignatureItem[] = [
    {
      title: "Dibuat oleh",
      role: "Adm Penjualan",
      name: data.salesName === "-" ? undefined : data.salesName,
    },
    { title: "Diperiksa oleh", role: "Adm Keuangan" },
    { title: "Dimuat oleh", role: "Adm Gudang/QC" },
    { title: "Pengirim", role: "Supir", name: data.driverName || undefined },
    { title: "Penerima", role: "Pembeli" },
  ];

  return (
    <>
      {pages.map((page) => (
        <section
          key={page.pageNumber}
          className="document-paper document-paper--a4 document-page mb-4 flex flex-col bg-white text-black print:mb-0"
        >
          <DocumentHeaderA4
            letterhead={data.letterhead}
            title="SURAT JALAN"
          />

          <div className="mt-3 grid grid-cols-[1.25fr_0.75fr] gap-3">
            <DocumentBox>
              <DocumentBoxTitle>KIRIM KE</DocumentBoxTitle>
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
            </DocumentBox>

            <DocumentBox>
              <DocumentInfoList items={infoItems} />
            </DocumentBox>
          </div>

          <div className="mt-3 flex min-h-[400px] flex-1 flex-col border border-black">
            <table className="w-full table-fixed border-collapse text-[9.5px]">
              <colgroup>
                <col className="w-[6%]" />
                <col className="w-[15%]" />
                <col style={{ width: nameWidth }} />
                <col className="w-[7%]" />
                <col className="w-[8%]" />
                {hasLength ? <col className="w-[8%]" /> : null}
                {hasWeight ? <col className="w-[8%]" /> : null}
                <col className="w-[14%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-black bg-neutral-100 text-[8.5px] font-bold tracking-[0.05em] uppercase">
                  <th className="px-1 py-1.5 text-center">No</th>
                  <th className="px-1 py-1.5 text-left">Kode</th>
                  <th className="px-1 py-1.5 text-left">Nama barang</th>
                  <th className="px-1 py-1.5 text-right">Qty</th>
                  <th className="px-1 py-1.5 text-left">Sat.</th>
                  {hasLength ? (
                    <th className="px-1 py-1.5 text-right">Panjang (m)</th>
                  ) : null}
                  {hasWeight ? (
                    <th className="px-1 py-1.5 text-right">Berat (kg)</th>
                  ) : null}
                  <th className="px-1 py-1.5 text-center">Cek QC (kirim)</th>
                  <th className="px-1 py-1.5 text-center">
                    Cek terima (tiba)
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((item) => (
                  <tr
                    key={`${item.code}-${data.items.indexOf(item)}`}
                    className="break-inside-avoid border-b border-neutral-300"
                  >
                    <td className="px-1 py-1 text-center">
                      {data.items.indexOf(item) + 1}
                    </td>
                    <td className="px-1 py-1 font-mono text-[8.5px]">
                      {item.code}
                    </td>
                    <td className="px-1 py-1 break-words">{item.name}</td>
                    <td className="px-1 py-1 text-right tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="px-1 py-1">{item.unit}</td>
                    {hasLength ? (
                      <td className="px-1 py-1 text-right tabular-nums">
                        {item.totalLengthM !== undefined
                          ? formatDecimal(item.totalLengthM)
                          : "-"}
                      </td>
                    ) : null}
                    {hasWeight ? (
                      <td className="px-1 py-1 text-right tabular-nums">
                        {item.totalWeightKg !== undefined
                          ? formatDecimal(item.totalWeightKg)
                          : "-"}
                      </td>
                    ) : null}
                    <td className="px-1 py-1 text-center">
                      <span className="inline-block h-3.5 w-3.5 border border-black align-middle" />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <span className="inline-block h-3.5 w-3.5 border border-black align-middle" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex-1" />

            {page.isLast ? (
              <div className="border-t border-black px-1.5 py-1 text-[9px] font-bold">
                Total kirim: {data.totalItems} item · {data.totalQuantity} unit
                dasar
                {hasLength || hasWeight ? (
                  <div className="mt-0.5 text-[8.5px] font-normal">
                    Panjang total {formatDecimal(data.totalLengthM)} m · Berat
                    total {formatDecimal(data.totalWeightKg)} kg
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="mt-2 mb-0 text-[9px]">
            <span className="font-bold">Catatan: </span>
            {data.note || "-"}
          </p>

          {page.isLast ? (
            <div className="mt-auto pt-3">
              <DocumentSignatures items={signatureItems} />
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <footer className="mt-2 flex items-center justify-between border-t border-neutral-300 pt-1 text-[8px] text-neutral-500">
            <span>Barang yang sudah diterima tidak dapat dikembalikan.</span>
            <span>
              Hal. {page.pageNumber}/{page.totalPages}
            </span>
          </footer>
        </section>
      ))}
    </>
  );
}
