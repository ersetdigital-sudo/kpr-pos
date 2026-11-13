import { DocumentLetterhead } from "@/features/documents/components/DocumentLetterhead";
import {
  formatDocumentDate,
  paginateDeliveryNote,
} from "@/features/documents/data/print-helpers";
import type { DeliveryNoteViewData } from "@/features/documents/types";

interface DeliveryNoteDotMatrixDocumentProps {
  data: DeliveryNoteViewData;
}

const SIGNATURES = [
  { title: "Dibuat oleh", role: "Adm Penjualan" },
  { title: "Diperiksa oleh", role: "Adm Keuangan" },
  { title: "Dimuat oleh", role: "Adm Gudang/QC" },
  { title: "Pengirim", role: "Supir" },
  { title: "Penerima", role: "Pembeli" },
] as const;

function MetaCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <td className="border border-black px-1 py-[2px] align-top">
      <span className="block text-[7px] leading-tight uppercase">{label}</span>
      <span className="block text-[9px] leading-tight font-bold">
        {value || "-"}
      </span>
    </td>
  );
}

export function DeliveryNoteDotMatrixDocument({
  data,
}: DeliveryNoteDotMatrixDocumentProps) {
  const pages = paginateDeliveryNote(data.items, "dot_matrix");

  return (
    <>
      {pages.map((page) => (
        <section
          key={page.pageNumber}
          className="document-paper document-paper--dot document-page mb-4 bg-white text-black print:mb-0"
        >
          <DocumentLetterhead letterhead={data.letterhead} variant="dot_matrix" />

          <div className="mt-1 flex items-end justify-between gap-2 border-b border-black pb-0.5">
            <div className="text-[14px] font-bold tracking-[0.12em] uppercase">
              SURAT JALAN
            </div>
            <div className="text-[8px]">
              Hal. {page.pageNumber}/{page.totalPages}
            </div>
          </div>

          <table className="mt-1.5 w-full border-collapse">
            <tbody>
              <tr>
                <MetaCell label="No. SJ" value={data.number} />
                <MetaCell
                  label="Tanggal"
                  value={formatDocumentDate(data.date)}
                />
                <MetaCell label="No. Polisi" value={data.vehicleNumber} />
              </tr>
              <tr>
                <MetaCell label="Supir" value={data.driverName} />
                <MetaCell label="No. Order" value={data.orderNumber} />
                <MetaCell label="Sales" value={data.salesName} />
              </tr>
            </tbody>
          </table>

          <table className="mt-1 w-full border-collapse">
            <tbody>
              <tr>
                <td className="w-[46px] border border-black px-1 py-[2px] align-top text-[8px] uppercase">
                  Kirim ke
                </td>
                <td className="border border-black px-1 py-[2px] align-top">
                  <span className="block text-[10px] font-bold">
                    {data.party.name}
                  </span>
                  {data.party.address ? (
                    <span className="block text-[8px] leading-tight whitespace-pre-line">
                      {data.party.address}
                    </span>
                  ) : null}
                  {data.party.phone ? (
                    <span className="block text-[8px] leading-tight">
                      Telp. {data.party.phone}
                    </span>
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="mt-1 w-full table-fixed border-collapse text-[8.5px]">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[15%]" />
              <col className="w-[37%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="text-[7.5px] uppercase">
                <th className="border border-black px-1 py-[2px] text-center">
                  No
                </th>
                <th className="border border-black px-1 py-[2px] text-left">
                  Kode
                </th>
                <th className="border border-black px-1 py-[2px] text-left">
                  Nama Barang
                </th>
                <th className="border border-black px-1 py-[2px] text-right">
                  Qty
                </th>
                <th className="border border-black px-1 py-[2px] text-left">
                  Satuan
                </th>
                <th className="border border-black px-1 py-[2px] text-center">
                  Cek QC
                  <br />
                  (kirim)
                </th>
                <th className="border border-black px-1 py-[2px] text-center">
                  Cek terima
                  <br />
                  (tiba)
                </th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((item) => (
                <tr key={`${item.code}-${data.items.indexOf(item)}`}>
                  <td className="border border-black px-1 py-[2px] text-center">
                    {data.items.indexOf(item) + 1}
                  </td>
                  <td className="border border-black px-1 py-[2px] break-all">
                    {item.code}
                  </td>
                  <td className="border border-black px-1 py-[2px] break-words">
                    {item.name}
                  </td>
                  <td className="border border-black px-1 py-[2px] text-right">
                    {item.quantity}
                  </td>
                  <td className="border border-black px-1 py-[2px]">
                    {item.unit}
                  </td>
                  <td className="border border-black px-1 py-[2px] text-center">
                    [ ]
                  </td>
                  <td className="border border-black px-1 py-[2px] text-center">
                    [ ]
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {page.isLast ? (
            <>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-2 border border-black px-1.5 py-1">
                <div>
                  <div className="text-[9px] font-bold">
                    Total kirim: {data.totalItems} item / {data.totalQuantity} unit
                  </div>
                  {data.note ? (
                    <div className="mt-0.5 text-[8px] leading-tight">
                      Catatan: {data.note}
                    </div>
                  ) : null}
                  <div className="mt-0.5 text-[8px] font-bold">
                    Barang yang sudah diterima tidak dapat dikembalikan.
                  </div>
                </div>
                <div className="text-[8px]">Cabang {data.branchName}</div>
              </div>

              <div className="mt-1 grid grid-cols-5 gap-1 text-center">
                {SIGNATURES.map((signature) => (
                  <div key={signature.title} className="break-inside-avoid">
                    <div className="flex h-9 items-end justify-center pb-0.5 text-[8px] font-bold">
                      {signature.title === "Dibuat oleh"
                        ? data.salesName === "-"
                          ? ""
                          : data.salesName
                        : signature.title === "Pengirim"
                          ? data.driverName
                          : ""}
                    </div>
                    <div className="border-t border-black pt-0.5">
                      <div className="text-[7px] font-bold">
                        {signature.title}
                      </div>
                      <div className="text-[6.5px] uppercase">
                        {signature.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="mt-1 flex justify-between border-t border-black pt-0.5 text-[7.5px]">
            <span>{data.letterhead.businessName || "KPR POS"}</span>
            <span>
              Hal. {page.pageNumber}/{page.totalPages}
            </span>
          </div>
        </section>
      ))}
    </>
  );
}
