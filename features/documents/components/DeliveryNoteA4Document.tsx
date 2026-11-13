import { DocumentLetterhead } from "@/features/documents/components/DocumentLetterhead";
import {
  formatDocumentDate,
  paginateDeliveryNote,
} from "@/features/documents/data/print-helpers";
import type { DeliveryNoteViewData } from "@/features/documents/types";

interface DeliveryNoteA4DocumentProps {
  data: DeliveryNoteViewData;
}

const SIGNATURES = [
  { title: "Dibuat oleh", role: "Adm Penjualan" },
  { title: "Diperiksa oleh", role: "Adm Keuangan" },
  { title: "Dimuat oleh", role: "Adm Gudang / QC" },
  { title: "Pengirim", role: "Supir" },
  { title: "Penerima", role: "Pembeli" },
] as const;

export function DeliveryNoteA4Document({ data }: DeliveryNoteA4DocumentProps) {
  const pages = paginateDeliveryNote(data.items, "a4");

  return (
    <>
      {pages.map((page) => (
        <section
          key={page.pageNumber}
          className="document-paper document-paper--a4 document-page mb-4 bg-white text-black print:mb-0"
        >
          <DocumentLetterhead letterhead={data.letterhead} variant="a4" />

          <div className="mt-4 flex items-end justify-between gap-3 border-b border-black pb-2">
            <div>
              <h2 className="m-0 text-[21px] leading-none font-extrabold tracking-[0.18em]">
                SURAT JALAN
              </h2>
              <p className="mt-1 mb-0 text-[9.5px] tracking-[0.14em] text-neutral-500 uppercase">
                Bukti pengiriman barang
              </p>
            </div>
            <p className="m-0 text-[9px] font-semibold tracking-[0.12em] text-neutral-500 uppercase">
              Hal. {page.pageNumber}/{page.totalPages}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-x-5 gap-y-1.5 text-[10px]">
            <div>
              <p className="m-0 text-[8.5px] tracking-[0.1em] text-neutral-500 uppercase">
                No. SJ
              </p>
              <p className="m-0 font-semibold">{data.number}</p>
            </div>
            <div>
              <p className="m-0 text-[8.5px] tracking-[0.1em] text-neutral-500 uppercase">
                Tanggal
              </p>
              <p className="m-0">{formatDocumentDate(data.date)}</p>
            </div>
            <div>
              <p className="m-0 text-[8.5px] tracking-[0.1em] text-neutral-500 uppercase">
                No. Polisi
              </p>
              <p className="m-0">{data.vehicleNumber || "-"}</p>
            </div>
            <div>
              <p className="m-0 text-[8.5px] tracking-[0.1em] text-neutral-500 uppercase">
                Supir
              </p>
              <p className="m-0">{data.driverName || "-"}</p>
            </div>
            <div>
              <p className="m-0 text-[8.5px] tracking-[0.1em] text-neutral-500 uppercase">
                No. Order
              </p>
              <p className="m-0">{data.orderNumber}</p>
            </div>
            <div>
              <p className="m-0 text-[8.5px] tracking-[0.1em] text-neutral-500 uppercase">
                Sales
              </p>
              <p className="m-0">{data.salesName}</p>
            </div>
          </div>

          <section className="mt-3 border border-neutral-400 px-3 py-2">
            <p className="m-0 text-[8.5px] font-semibold tracking-[0.1em] text-neutral-500 uppercase">
              Kirim ke
            </p>
            <p className="mt-0.5 mb-0 text-[11px] font-bold">
              {data.party.name}
            </p>
            {data.party.address ? (
              <p className="mt-0.5 mb-0 text-[10px] leading-snug whitespace-pre-line">
                {data.party.address}
              </p>
            ) : null}
            {data.party.phone ? (
              <p className="mt-0.5 mb-0 text-[10px]">
                Telp. {data.party.phone}
              </p>
            ) : null}
          </section>

          <table className="mt-3 w-full table-fixed border-collapse text-[10px]">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[16%]" />
              <col className="w-[36%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="border-y border-black bg-neutral-100 text-[8.5px] font-bold tracking-[0.06em] uppercase">
                <th className="px-1 py-1.5 text-center">No</th>
                <th className="px-1 py-1.5 text-left">Kode</th>
                <th className="px-1 py-1.5 text-left">Nama Barang</th>
                <th className="px-1 py-1.5 text-right">Qty</th>
                <th className="px-1 py-1.5 text-left">Satuan</th>
                <th className="px-1 py-1.5 text-center">Cek QC (kirim)</th>
                <th className="px-1 py-1.5 text-center">Cek terima (tiba)</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((item) => (
                <tr
                  key={`${item.code}-${data.items.indexOf(item)}`}
                  className="border-b border-neutral-300"
                >
                  <td className="px-1 py-1.5 text-center">
                    {data.items.indexOf(item) + 1}
                  </td>
                  <td className="px-1 py-1.5 font-mono text-[9px]">
                    {item.code}
                  </td>
                  <td className="px-1 py-1.5 break-words">{item.name}</td>
                  <td className="px-1 py-1.5 text-right tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="px-1 py-1.5">{item.unit}</td>
                  <td className="px-1 py-1.5 text-center font-mono">[ ]</td>
                  <td className="px-1 py-1.5 text-center font-mono">[ ]</td>
                </tr>
              ))}
            </tbody>
          </table>

          {page.isLast ? (
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-[250px] flex-1 border border-neutral-400 px-3 py-2">
                <p className="m-0 text-[9px] font-bold tracking-[0.08em] uppercase">
                  Total kirim
                </p>
                <p className="mt-0.5 mb-0 text-[10.5px]">
                  {data.totalItems} item · {data.totalQuantity} unit
                </p>
                {data.note ? (
                  <p className="mt-1 mb-0 text-[10px] leading-snug">
                    Catatan: {data.note}
                  </p>
                ) : null}
                <p className="mt-1 mb-0 text-[9px] leading-snug font-semibold">
                  Barang yang sudah diterima tidak dapat dikembalikan.
                </p>
              </div>
              <p className="m-0 text-[9.5px] text-neutral-600">
                Cabang {data.branchName}
              </p>
            </div>
          ) : null}

          {page.isLast ? (
            <div className="mt-5 grid grid-cols-5 gap-3 text-center text-[8px]">
              {SIGNATURES.map((signature) => (
                <div key={signature.title} className="break-inside-avoid">
                  <div className="flex h-12 items-end justify-center pb-0.5 text-[9px] font-semibold">
                    {signature.title === "Dibuat oleh"
                      ? data.salesName === "-"
                        ? ""
                        : data.salesName
                      : signature.title === "Pengirim"
                        ? data.driverName
                        : ""}
                  </div>
                  <div className="border-t border-black pt-1">
                    <p className="m-0 font-semibold">{signature.title}</p>
                    <p className="m-0 text-[7.5px] text-neutral-600">
                      {signature.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <footer className="mt-4 flex items-center justify-between border-t border-neutral-300 pt-1.5 text-[8px] text-neutral-500">
            <span>{data.letterhead.businessName || "KPR POS"}</span>
            <span>
              Hal. {page.pageNumber}/{page.totalPages}
            </span>
          </footer>
        </section>
      ))}
    </>
  );
}
