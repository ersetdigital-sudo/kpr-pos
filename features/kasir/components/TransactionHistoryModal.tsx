"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import { formatDateTimeShort, formatRupiah } from "@/lib/format";
import { DocumentPrintButtons } from "@/features/documents/components/DocumentPrintButtons";
import type { TransactionHistoryRow } from "@/features/kasir/types";
import type { PaymentMethod } from "@/types";

type StatusFilter = "all" | "paid" | "refunded";

const PAYMENT_TONES: Record<PaymentMethod, BadgeTone> = {
  Cash: "neutral",
  QRIS: "info",
  Transfer: "warning",
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "Semua status",
  paid: "Belum direfund",
  refunded: "Direfund",
};

interface TransactionHistoryModalProps {
  open: boolean;
  transactions: readonly TransactionHistoryRow[];
  canRefund: boolean;
  /** Hapus permanen (khusus role berizin, mis. Owner). */
  canDelete: boolean;
  canPrint: boolean;
  onClose: () => void;
  onRequestRefund: (row: TransactionHistoryRow) => void;
  onRequestDelete: (row: TransactionHistoryRow) => void;
  onViewReceipt: (row: TransactionHistoryRow) => void;
}

export function TransactionHistoryModal({
  open,
  transactions,
  canRefund,
  canDelete,
  canPrint,
  onClose,
  onRequestRefund,
  onRequestDelete,
  onViewReceipt,
}: TransactionHistoryModalProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const rows = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return transactions.filter((row) => {
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "refunded" ? row.isRefunded : !row.isRefunded);
      const matchKeyword =
        !keyword ||
        row.invoiceNumber.toLowerCase().includes(keyword) ||
        row.cashierName.toLowerCase().includes(keyword);

      return matchStatus && matchKeyword;
    });
  }, [transactions, query, statusFilter]);

  const columns: readonly DataTableColumn<TransactionHistoryRow>[] = [
    {
      id: "invoice",
      header: "No. Struk",
      cell: (row) => (
        <div>
          <div className="font-semibold whitespace-nowrap text-ink">
            {row.invoiceNumber}
          </div>
          <div className="text-meta whitespace-nowrap text-ink-muted">
            {formatDateTimeShort(row.createdAt)}
          </div>
        </div>
      ),
    },
    {
      id: "cashier",
      header: "Kasir",
      cellClassName: "whitespace-nowrap",
      cell: (row) => row.cashierName,
    },
    {
      id: "items",
      header: "Item",
      align: "right",
      cellClassName: "whitespace-nowrap text-ink-soft",
      cell: (row) => `${row.itemCount} pcs`,
    },
    {
      id: "method",
      header: "Metode",
      cell: (row) => (
        <StatusBadge tone={PAYMENT_TONES[row.method]}>{row.method}</StatusBadge>
      ),
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      cellClassName: "whitespace-nowrap font-semibold text-ink",
      cell: (row) => formatRupiah(row.total),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) =>
        row.isRefunded ? (
          <div>
            <StatusBadge tone="danger">Direfund</StatusBadge>
            <div className="mt-0.5 text-meta whitespace-nowrap text-ink-muted">
              {row.refundedByName ?? "Kasir"} ·{" "}
              {row.refundedAt ? formatDateTimeShort(row.refundedAt) : "-"}
            </div>
          </div>
        ) : (
          <StatusBadge tone="success">Lunas</StatusBadge>
        ),
    },
    {
      id: "action",
      header: "Aksi",
      align: "right",
      cell: (row) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <DocumentPrintButtons
            canPrint={canPrint}
            className="flex flex-wrap items-center gap-1.5"
            invoiceSource={{ sourceType: "transaction", sourceId: row.id }}
            deliveryNoteSource={
              row.linkedOrderId
                ? {
                    sourceType: "sales_order",
                    sourceId: row.linkedOrderId,
                  }
                : undefined
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewReceipt(row)}
          >
            Struk
          </Button>
          {canRefund && !row.isRefunded ? (
            <Button
              variant="dangerOutline"
              size="sm"
              onClick={() => onRequestRefund(row)}
            >
              Refund
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="dangerOutline"
              size="sm"
              aria-label={`Hapus transaksi ${row.invoiceNumber}`}
              title={`Hapus transaksi ${row.invoiceNumber}`}
              onClick={() => onRequestDelete(row)}
            >
              Hapus
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Riwayat Transaksi"
      description="Transaksi cabang aktif. Refund mengembalikan stok; hapus transaksi hanya untuk role berizin dan tercatat di Log Aktivitas."
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchField
          label="Cari transaksi"
          placeholder="Cari no. struk atau kasir…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-[180px] flex-1"
        />
        <Select
          aria-label="Filter status transaksi"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as StatusFilter)
          }
          className="h-[42px] w-auto px-2.5"
        >
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            Belum ada transaksi
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            {transactions.length === 0
              ? "Transaksi yang dibayar di kasir akan muncul di sini."
              : "Tidak ada transaksi yang cocok dengan filter ini."}
          </p>
        </div>
      ) : (
        <DataTable
          ariaLabel="Riwayat transaksi"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          minWidth={980}
        />
      )}
    </Modal>
  );
}
