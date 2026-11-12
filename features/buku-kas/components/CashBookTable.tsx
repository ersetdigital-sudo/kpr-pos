import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import type { CashBookRow } from "@/features/buku-kas/types";

interface CashBookTableProps {
  rows: readonly CashBookRow[];
  canManage: boolean;
  onEdit: (row: CashBookRow) => void;
  onDelete: (row: CashBookRow) => void;
}

export function CashBookTable({
  rows,
  canManage,
  onEdit,
  onDelete,
}: CashBookTableProps) {
  const columns: readonly DataTableColumn<CashBookRow>[] = [
    {
      id: "date",
      header: "Tanggal",
      cell: (row) => (
        <span className="font-semibold whitespace-nowrap text-ink">
          {row.dateLabel}
        </span>
      ),
    },
    {
      id: "type",
      header: "Jenis",
      cell: (row) => (
        <StatusBadge tone={row.type === "masuk" ? "success" : "danger"}>
          {row.type === "masuk" ? "Masuk" : "Keluar"}
        </StatusBadge>
      ),
    },
    {
      id: "category",
      header: "Kategori",
      cell: (row) => (
        <span className="whitespace-nowrap text-ink-soft">
          {row.categoryName}
        </span>
      ),
    },
    {
      id: "description",
      header: "Keterangan",
      cell: (row) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-ink">{row.description}</div>
          {row.automatic && row.automaticLabel ? (
            <div className="text-meta text-ink-muted">
              {row.automaticLabel}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "amount",
      header: "Nominal",
      align: "right",
      cell: (row) => (
        <span
          className={cn(
            "font-semibold whitespace-nowrap",
            row.type === "masuk" ? "text-success-ink" : "text-danger-ink",
          )}
        >
          {row.type === "masuk" ? "+" : "-"} {formatRupiah(row.amount)}
        </span>
      ),
    },
    {
      id: "branch",
      header: "Cabang",
      cell: (row) => (
        <span className="whitespace-nowrap text-ink-soft">{row.branchName}</span>
      ),
    },
    {
      id: "actor",
      header: "Dicatat Oleh",
      cell: (row) => (
        <span
          className={cn(
            "whitespace-nowrap",
            row.automatic ? "text-ink-muted" : "text-ink-soft",
          )}
        >
          {row.actorName}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            id: "action",
            header: <span className="sr-only">Aksi</span>,
            align: "right" as const,
            cell: (row: CashBookRow) =>
              row.automatic || !row.entryId ? (
                <span className="text-meta text-ink-muted">—</span>
              ) : (
                <div className="flex justify-end gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-[32px] px-2.5 text-meta"
                    onClick={() => onEdit(row)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    className="h-[32px] px-2.5 text-meta"
                    onClick={() => onDelete(row)}
                  >
                    Hapus
                  </Button>
                </div>
              ),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      ariaLabel="Tabel buku kas"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      minWidth={940}
      density="roomy"
      headerTone="soft"
    />
  );
}
