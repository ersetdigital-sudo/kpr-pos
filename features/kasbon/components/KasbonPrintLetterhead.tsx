import Image from "next/image";
import type { BusinessProfile } from "@/lib/store/types";

interface KasbonPrintLetterheadProps {
  business: BusinessProfile;
  title: string;
  subtitle: string;
}

/** Kop cetak kasbon, konsisten dengan kop laporan. */
export function KasbonPrintLetterhead({
  business,
  title,
  subtitle,
}: KasbonPrintLetterheadProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink/30 pb-3">
      <div className="flex items-start gap-3">
        <Image
          src={business.logoUrl || "/logo-kpr.png"}
          alt="Logo usaha"
          width={56}
          height={58}
          className="object-contain"
        />
        <div>
          <div className="text-[15px] font-bold">{business.name}</div>
          <div className="text-[11px]">{business.address}</div>
          <div className="text-[11px]">{business.phone}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[18px] font-extrabold">{title}</div>
        <div className="text-[11px]">{subtitle}</div>
      </div>
    </div>
  );
}
