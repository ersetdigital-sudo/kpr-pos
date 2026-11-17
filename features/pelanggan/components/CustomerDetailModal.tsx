"use client";

import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import {
  formatDateTimeShort,
  formatRupiah,
} from "@/lib/format";
import type { SalesOrderStatus } from "@/lib/store/types";
import type {
  CustomerHistoryRow,
  CustomerRow,
  CustomerSpendingSummary,
} from "@/features/pelanggan/types";

const STATUS_LABEL: Record<SalesOrderStatus, string> = {
  "Belum sinkron": "Belum sinkron",
  "Menunggu bayar": "Menunggu bayar",
  "COD - menunggu pembayaran": "COD berjalan",
  "Tempo - menunggu pembayaran": "Tempo berjalan",
  Lunas: "Lunas",
  Dibatalkan: "Batal",
};

const STATUS_TONE: Record<SalesOrderStatus, BadgeTone> = {
  "Belum sinkron": "neutral",
  "Menunggu bayar": "neutral",
  "COD - menunggu pembayaran": "warning",
  "Tempo - menunggu pembayaran": "warning",
  Lunas: "success",
  Dibatalkan: "danger",
};

const columns: readonly DataTableColumn<CustomerHistoryRow>[] = [
  {
    id: "date",
    header: "Tanggal",
    cellClassName: "whitespace-nowrap text-ink-muted",
    cell: (row) => formatDateTimeShort(row.at),
  },
  {
    id: "number",
    header: "Nomor",
    cellClassName: "font-semibold whitespace-nowrap text-ink",
    cell: (row) => row.orderNumber,
  },
  {
    id: "method",
    header: "Metode",
    cell: (row) => row.method,
  },
  {
    id: "total",
    header: "Total",
    align: "right",
    cellClassName: "whitespace-nowrap",
    cell: (row) => formatRupiah(row.total),
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => (
      <StatusBadge tone={STATUS_TONE[row.status]}>
        {STATUS_LABEL[row.status]}
      </StatusBadge>
    ),
  },
];

interface CustomerDetailModalProps {
  customer: CustomerRow;
  summary: CustomerSpendingSummary;
  history: readonly CustomerHistoryRow[];
  periodLabel: string;
  onClose: () => void;
}

/** Riwayat belanja pelanggan pada periode aktif; angka dari rekap yang sama. */
export function CustomerDetailModal({
  customer,
  summary,
  history,
  periodLabel,
  onClose,
}: CustomerDetailModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title={customer.name}
      description={`Riwayat belanja · ${periodLabel}`}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="rounded-control border border-line bg-canvas px-3 py-2.5">
            <p className="m-0 text-meta text-ink-muted">Transaksi</p>
            <p className="m-0 mt-0.5 text-body font-bold text-ink">
              {summary.transactionCount}
            </p>
          </div>
          <div className="rounded-control border border-line bg-canvas px-3 py-2.5">
            <p className="m-0 text-meta text-ink-muted">Total belanja</p>
            <p className="m-0 mt-0.5 text-body font-bold text-ink">
              {formatRupiah(summary.totalSpending)}
            </p>
          </div>
          <div className="rounded-control border border-line bg-canvas px-3 py-2.5">
            <p className="m-0 text-meta text-ink-muted">Belanja terakhir</p>
            <p className="m-0 mt-0.5 text-body font-bold text-ink">
              {summary.lastPurchaseAt
                ? formatDateTimeShort(summary.lastPurchaseAt)
                : "—"}
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-body text-ink-muted">
            Belum ada pesanan pada periode ini.
          </div>
        ) : (
          <DataTable
            ariaLabel={`Riwayat belanja ${customer.name}`}
            columns={columns}
            rows={history}
            rowKey={(row) => row.id}
            minWidth={620}
            density="roomy"
            headerTone="soft"
          />
        )}

        <p className="m-0 text-meta text-ink-muted">
          Ringkasan hanya menghitung pesanan lunas dan COD/Tempo berjalan.
          Riwayat menampilkan semua pesanan pada periode ini, termasuk yang
          dibatalkan atau masih menunggu.
        </p>
      </div>
    </Modal>
  );
}
