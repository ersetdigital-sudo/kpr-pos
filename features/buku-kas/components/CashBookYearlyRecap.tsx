import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatRupiah } from "@/lib/format";
import type { CashBookMonthRecap } from "@/features/buku-kas/types";

interface CashBookYearlyRecapProps {
  rows: readonly CashBookMonthRecap[];
  saldoAwal: number;
  saldoAkhir: number;
}

export function CashBookYearlyRecap({
  rows,
  saldoAwal,
  saldoAkhir,
}: CashBookYearlyRecapProps) {
  const columns: readonly DataTableColumn<CashBookMonthRecap>[] = [
    {
      id: "month",
      header: "Bulan",
      cell: (row) => (
        <span className="font-semibold whitespace-nowrap text-ink">
          {row.label}
        </span>
      ),
    },
    {
      id: "masuk",
      header: "Pemasukan",
      align: "right",
      cell: (row) => (
        <span className="whitespace-nowrap text-success-ink">
          {formatRupiah(row.masuk)}
        </span>
      ),
    },
    {
      id: "keluar",
      header: "Pengeluaran",
      align: "right",
      cell: (row) => (
        <span className="whitespace-nowrap text-danger-ink">
          {formatRupiah(row.keluar)}
        </span>
      ),
    },
    {
      id: "saldo",
      header: "Saldo",
      align: "right",
      cell: (row) => (
        <span className="font-semibold whitespace-nowrap text-ink">
          {formatRupiah(row.saldo)}
        </span>
      ),
    },
  ];

  return (
    <Card className="flex flex-col gap-3.5 p-[18px]">
      <CardHeader
        title="Tutup Buku Tahunan"
        subtitle={`Saldo awal tahun ${formatRupiah(saldoAwal)} · saldo akhir tahun ${formatRupiah(saldoAkhir)}`}
      />

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
          Belum ada mutasi kas pada tahun ini.
        </div>
      ) : (
        <DataTable
          ariaLabel="Rekap saldo per bulan"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.month}
          minWidth={520}
          density="roomy"
          headerTone="soft"
        />
      )}
    </Card>
  );
}
