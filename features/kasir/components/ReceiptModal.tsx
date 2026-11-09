"use client";

import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ReceiptPaper } from "@/features/kasir/components/ReceiptPaper";
import type { ReceiptViewData } from "@/features/kasir/types";

interface ReceiptModalProps {
  receipt: ReceiptViewData | null;
  onClose: () => void;
}

export function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  if (!receipt) return null;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Preview Struk"
        description={`Ukuran ${receipt.paperSize}mm · ${receipt.branchName}`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              Cetak / Simpan PDF
            </Button>
          </>
        }
      >
        <div className="flex justify-center bg-canvas p-3">
          <ReceiptPaper receipt={receipt} />
        </div>
      </Modal>

      {typeof document !== "undefined"
        ? createPortal(
            <div
              id="receipt-print-root"
              className="hidden"
              aria-hidden="true"
            >
              <div className="flex justify-center">
                <ReceiptPaper receipt={receipt} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
