import { Icon } from "@/components/ui/Icon";
import { formatRupiah } from "@/lib/format";

interface QrisPaymentProps {
  total: number;
}

export function QrisPayment({ total }: QrisPaymentProps) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-control-lg border border-line bg-canvas p-3">
      <div className="flex h-[132px] w-[132px] shrink-0 items-center justify-center rounded-control border border-dashed border-line-strong bg-surface text-ink-muted">
        <Icon name="qr" size={56} strokeWidth={1.5} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-label font-semibold text-ink">
          QRIS · semua e-wallet
        </div>
        <div className="mt-2 text-meta text-ink-muted">Nominal tagihan</div>
        <div className="mt-[2px] text-panel-title font-extrabold text-ink">
          {formatRupiah(total)}
        </div>
        <p className="mt-2 mb-0 text-meta text-ink-muted">
          Minta pelanggan memindai kode QR di samping.
        </p>
      </div>
    </div>
  );
}
