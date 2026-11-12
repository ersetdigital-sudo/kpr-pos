import { StatCard } from "@/components/ui/StatCard";
import { formatNumber, formatRupiah, formatRupiahCompact } from "@/lib/format";
import type { CashBookSummary } from "@/features/buku-kas/types";

interface CashBookSummaryCardsProps {
  summary: CashBookSummary;
}

export function CashBookSummaryCards({ summary }: CashBookSummaryCardsProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
      <StatCard
        label="Total Pemasukan"
        value={formatRupiahCompact(summary.totalMasuk)}
        hint="Termasuk penjualan otomatis, PPN & ongkir"
        valueTone="success"
        hintTone="success"
      />
      <StatCard
        label="Total Pengeluaran"
        value={formatRupiahCompact(summary.totalKeluar)}
        hint={`${formatNumber(summary.entryCount)} entri manual`}
        valueTone="danger"
      />
      <StatCard
        label="Saldo"
        value={formatRupiahCompact(summary.saldoAkhir)}
        hint={`Saldo awal ${formatRupiah(summary.saldoAwal)}`}
      />
    </div>
  );
}
