import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import type { SalesOrderStatus } from "@/lib/store/types";

const STATUS_TONES: Record<SalesOrderStatus, BadgeTone> = {
  "Belum sinkron": "warning",
  "Menunggu bayar": "brand",
  "COD - menunggu pembayaran": "info",
  "Tempo - menunggu pembayaran": "warning",
  Lunas: "success",
  Dibatalkan: "danger",
};

const STATUS_LABELS: Record<SalesOrderStatus, string> = {
  "Belum sinkron": "Belum sinkron",
  "Menunggu bayar": "Menunggu bayar",
  "COD - menunggu pembayaran": "COD · belum lunas",
  "Tempo - menunggu pembayaran": "Tempo · belum lunas",
  Lunas: "Lunas",
  Dibatalkan: "Dibatalkan",
};

interface OrderStatusBadgeProps {
  status: SalesOrderStatus;
  className?: string;
}

/** Badge status pesanan saat ini; satu status per baris tabel. */
export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <StatusBadge
      tone={STATUS_TONES[status]}
      className={className ?? "whitespace-nowrap"}
    >
      {STATUS_LABELS[status]}
    </StatusBadge>
  );
}
