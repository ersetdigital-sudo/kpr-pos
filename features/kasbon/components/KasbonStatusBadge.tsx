import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BadgeTone } from "@/components/ui/badge-tone";
import type { KasbonStatus } from "@/lib/store/types";

const STATUS_TONES: Record<KasbonStatus, BadgeTone> = {
  "Menunggu Accounting": "warning",
  "Menunggu Manager": "warning",
  "Menunggu Owner": "warning",
  Disetujui: "brand",
  Lunas: "success",
  Ditolak: "danger",
};

interface KasbonStatusBadgeProps {
  status: KasbonStatus;
  className?: string;
}

/** Badge status kasbon memakai StatusBadge bersama agar konsisten. */
export function KasbonStatusBadge({
  status,
  className,
}: KasbonStatusBadgeProps) {
  return (
    <StatusBadge tone={STATUS_TONES[status]} className={className}>
      {status}
    </StatusBadge>
  );
}
