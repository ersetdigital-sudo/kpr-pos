import { formatDecimal } from "@/lib/units";
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
  formatDocumentDate,
  paginateDeliveryNote,
} from "@/features/documents/data/print-helpers";
import type { DeliveryNoteViewData } from "@/features/documents/types";

interface DeliveryNoteDotMatrixDocumentProps {
  data: DeliveryNoteViewData;
}

export function DeliveryNoteDotMatrixDocument({
  data,
}: DeliveryNoteDotMatrixDocumentProps) {
  const pages = paginateDeliveryNote(data.items, "dot_matrix");
  const hasLength = data.items.some(
    (item) => item.totalLengthM !== undefined,
  );
  const hasWeight = data.items.some(
    (item) => item.totalWeightKg !== undefined,
  );
  const nameWidth =
    hasLength && hasWeight ? "20%" : hasLength || hasWeight ? "28%" : "36%";

  const metaItems = [
    { label: "Tanggal", value: formatDocumentDate(data.date) },
    { label: "No. SJ", value: data.number },
    { label: "No. Pol", value: data.vehicleNumber || "-" },
    { label: "Supir", value: data.driverName || "-" },
    { label: "No. Order", value: data.orderNumber },
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

          <div className="mt-1 text-center text-[13px] font-bold tracking-[0.45em] uppercase">
            SURAT JALAN
          </div>

          <div className="mt-1 flex flex-col gap-0.5 text-[8.5px]">
            <div>
              <span className="font-bold">Kirim ke:</span> {data.party.name}
            </div>
            {data.party.phone.trim() ? (
              <div>
                <span className="font-bold">Penerima/Telp:</span>{" "}
                {data.party.phone}
              </div>
            ) : null}
          </div>

          <div className="mt-1 flex min-h-[290px] flex-1 flex-col border border-black">
            <table className="w-full table-fixed border-collapse text-[8.5px]">
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
                  <th className="border-b border-black px-1 py-[2px] text-center">
                    Cek QC
                  </th>
                  <th className="border-b border-black px-1 py-[2px] text-center">
                    Cek terima
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((item) => (
                  <tr
                    key={`${item.code}-${data.items.indexOf(item)}`}
                    className="break-inside-avoid border-b border-black"
                  >
                    <td className="px-1 py-[2px] text-center">
                      {data.items.indexOf(item) + 1}
                    </td>
                    <td className="px-1 py-[2px] break-all">
                      {item.code}
                    </td>
                    <td className="px-1 py-[2px] break-words">{item.name}</td>
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
                    <td className="px-1 py-[2px] text-center">[ ]</td>
                    <td className="px-1 py-[2px] text-center">[ ]</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex-1" />

            {page.isLast ? (
              <div className="border-t border-black px-1 py-[2px] text-[9px] font-bold">
                TOTAL KIRIM: {data.totalItems} item / {data.totalQuantity} unit
                dasar
                {hasLength || hasWeight ? (
                  <div className="mt-0.5 text-[8px] font-normal">
                    Panjang total {formatDecimal(data.totalLengthM)} m · Berat
                    total {formatDecimal(data.totalWeightKg)} kg
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DocumentBox className="mt-1 px-1.5 py-1" padded={false}>
            <div className="grid grid-cols-3 gap-x-3 text-[8px]">
              <div>Catatan: {data.note || "-"}</div>
              <div>Pembeli: {data.party.name}</div>
              {data.party.address.trim() ? (
                <div className="whitespace-pre-line">
                  Alamat: {data.party.address}
                </div>
              ) : (
                <div />
              )}
            </div>
          </DocumentBox>

          {page.isLast ? (
            <div className="mt-1">
              <DocumentSignatures items={signatureItems} variant="dot" />
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="mt-1 grid grid-cols-4 gap-2 border-t border-black pt-0.5 text-[7.5px]">
            <span>Note: {data.note || "-"}</span>
            <span>
              Lembar: {page.pageNumber}/{page.totalPages}
            </span>
            <span>Sales: {data.salesName}</span>
            <span className="text-right">Hal: {page.pageNumber}</span>
          </div>
        </section>
      ))}
    </>
  );
}
