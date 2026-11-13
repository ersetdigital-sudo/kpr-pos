"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useHydratedDatabase } from "@/lib/store/store";
import { PrintDocumentDialog } from "@/features/documents/components/PrintDocumentDialog";
import { getDocumentBlockReason } from "@/features/documents/data/document-source";
import type {
  DocumentSourceRef,
  PrintDocumentType,
} from "@/features/documents/types";

interface DocumentPrintButtonsProps {
  invoiceSource: DocumentSourceRef | null;
  /**
   * Surat jalan hanya untuk pesanan sales. `undefined` menyembunyikan tombol;
   * `null` menampilkan tombol nonaktif tanpa sumber.
   */
  deliveryNoteSource?: DocumentSourceRef | null;
  canPrint: boolean;
  className?: string;
}

export function DocumentPrintButtons({
  invoiceSource,
  deliveryNoteSource,
  canPrint,
  className = "flex flex-wrap items-center gap-1.5",
}: DocumentPrintButtonsProps) {
  const database = useHydratedDatabase();
  const [active, setActive] = useState<{
    docType: PrintDocumentType;
    source: DocumentSourceRef;
  } | null>(null);

  if (!canPrint) return null;
  if (!invoiceSource && deliveryNoteSource === undefined) return null;

  const invoiceReason =
    database && invoiceSource
      ? getDocumentBlockReason(database, invoiceSource, "invoice")
      : "Data dokumen belum siap.";
  const deliveryReason =
    database && deliveryNoteSource
      ? getDocumentBlockReason(database, deliveryNoteSource, "surat_jalan")
      : "Data dokumen belum siap.";

  function open(docType: PrintDocumentType, source: DocumentSourceRef | null) {
    if (!source) return;
    if (docType === "invoice" ? invoiceReason : deliveryReason) return;
    setActive({ docType, source });
  }

  return (
    <>
      <div className={className}>
        {invoiceSource ? (
          <Button
            variant="outline"
            size="sm"
            className="h-11 px-3 sm:h-9 sm:px-2.5"
            disabled={Boolean(invoiceReason)}
            title={invoiceReason ?? "Cetak invoice"}
            aria-label="Cetak invoice"
            onClick={() => open("invoice", invoiceSource)}
          >
            <Icon name="print" size={15} />
            Invoice
          </Button>
        ) : null}

        {deliveryNoteSource !== undefined ? (
          <Button
            variant="outline"
            size="sm"
            className="h-11 px-3 sm:h-9 sm:px-2.5"
            disabled={Boolean(deliveryReason)}
            title={deliveryReason ?? "Cetak surat jalan"}
            aria-label="Cetak surat jalan"
            onClick={() => open("surat_jalan", deliveryNoteSource)}
          >
            <Icon name="print" size={15} />
            Surat Jalan
          </Button>
        ) : null}
      </div>

      {active ? (
        <PrintDocumentDialog
          open
          source={active.source}
          docType={active.docType}
          onClose={() => setActive(null)}
        />
      ) : null}
    </>
  );
}
