import { Card, CardHeader } from "@/components/ui/Card";
import { formatDateShort, formatNumber, formatPercent, formatRupiah } from "@/lib/format";
import type { ReportTaxRow } from "@/features/laporan/types";

interface ReportTaxRecapCardProps {
  rows: readonly ReportTaxRow[];
  total: number;
}

function partyLabel(row: ReportTaxRow): string {
  return row.customerName || row.cashierName || "-";
}

/** Rekap rinci transaksi ber-PPN; tabel di desktop, kartu di mobile. */
export function ReportTaxRecapCard({ rows, total }: ReportTaxRecapCardProps) {
  return (
    <Card className="flex min-w-0 flex-col p-5">
      <CardHeader
        title="Rekap PPN"
        subtitle="Omzet tidak termasuk PPN; rincian ini hanya transaksi yang memakai PPN."
        action={
          <span className="text-meta font-semibold text-brand">
            {formatRupiah(total)}
          </span>
        }
        className="mb-3.5"
      />

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
          Belum ada transaksi ber-PPN pada filter ini.
        </div>
      ) : (
        <>
          <div className="hidden lg:block">
            <table className="w-full border-collapse text-meta">
              <thead>
                <tr className="border-b border-line text-left text-ink-muted">
                  <th className="py-2 pr-3 font-semibold">Dokumen</th>
                  <th className="py-2 pr-3 font-semibold">Tanggal</th>
                  <th className="py-2 pr-3 font-semibold">Pelanggan / Kasir</th>
                  <th className="py-2 pr-3 text-right font-semibold">
                    Dasar PPN
                  </th>
                  <th className="py-2 pr-3 text-right font-semibold">Tarif</th>
                  <th className="py-2 text-right font-semibold">PPN</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line-faint">
                    <td className="py-2 pr-3">
                      <div className="font-semibold text-ink">{row.number}</div>
                      <div className="text-meta text-ink-muted">
                        {row.source} · {row.branchName}
                      </div>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-ink-soft">
                      {formatDateShort(row.at)}
                    </td>
                    <td className="py-2 pr-3 text-ink-soft">{partyLabel(row)}</td>
                    <td className="py-2 pr-3 text-right text-ink-soft">
                      {formatRupiah(row.taxBase)}
                    </td>
                    <td className="py-2 pr-3 text-right text-ink-soft">
                      {formatPercent(row.taxRate)}
                    </td>
                    <td className="py-2 text-right font-semibold text-ink">
                      {formatRupiah(row.taxAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col gap-2 p-0 lg:hidden">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-control border border-line bg-canvas px-3.5 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 text-label font-semibold text-ink">
                      {row.number}
                    </p>
                    <p className="m-0 text-meta text-ink-muted">
                      {row.source} · {row.branchName} ·{" "}
                      {formatDateShort(row.at)}
                    </p>
                  </div>
                  <span className="shrink-0 text-label font-bold text-brand">
                    {formatRupiah(row.taxAmount)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-meta text-ink-muted">
                  <span>{partyLabel(row)}</span>
                  <span>
                    Dasar {formatRupiah(row.taxBase)} ·{" "}
                    {formatPercent(row.taxRate)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-3 mb-0 text-meta text-ink-muted">
            {formatNumber(rows.length)} transaksi ber-PPN
          </p>
        </>
      )}
    </Card>
  );
}
