import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import type { SalesOrderStatus } from "@/lib/store/types";

const STATUS_TONES: Record<SalesOrderStatus, BadgeTone> = {
  "Belum sinkron": "warning",
  "Menunggu bayar": "brand",
  Lunas: "success",
  Dibatalkan: "danger",
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
      {status}
    </StatusBadge>
  );
}
