"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { formatRupiah } from "@/lib/format";
import { useHydratedDatabase } from "@/lib/store/store";
import { DeliveryNoteDocument } from "@/features/documents/components/DeliveryNoteDocument";
import { InvoiceDocument } from "@/features/documents/components/InvoiceDocument";
import {
  ensurePrintDocument,
  loadPrintDocument,
  logDocumentPrinted,
} from "@/features/documents/data/document-repository";
import {
  buildInvoiceView,
  buildDeliveryNoteView,
  getDocumentBlockReason,
  resolveDocumentSource,
} from "@/features/documents/data/document-source";
import {
  buildPageSizeCss,
  readDeliveryNotePaper,
  saveDeliveryNotePaper,
} from "@/features/documents/data/print-helpers";
import type {
  DeliveryNotePaper,
  DocumentSourceRef,
  PrintDocumentRecord,
  PrintDocumentType,
} from "@/features/documents/types";

interface PrintDocumentDialogProps {
  open: boolean;
  source: DocumentSourceRef | null;
  docType: PrintDocumentType;
  onClose: () => void;
}

type Step = "form" | "preview";

export function PrintDocumentDialog({
  open,
  source,
  docType,
  onClose,
}: PrintDocumentDialogProps) {
  const database = useHydratedDatabase();
  const [step, setStep] = useState<Step>("form");
  const [paper, setPaper] = useState<DeliveryNotePaper>(() =>
    readDeliveryNotePaper(),
  );
  const [driverName, setDriverName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [note, setNote] = useState("");
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const [record, setRecord] = useState<PrintDocumentRecord | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(
    docType === "surat_jalan",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sourceType = source?.sourceType;
  const sourceId = source?.sourceId;

  useEffect(() => {
    if (docType !== "surat_jalan" || !sourceType || !sourceId) return;

    let cancelled = false;

    // Hanya callback asinkron yang mengubah state; dialog selalu dipasang baru
    // setiap kali dibuka sehingga nilai awal form tidak perlu di-reset.
    void loadPrintDocument(docType, sourceType, sourceId)
      .then((existing) => {
        if (cancelled || !existing) return;
        setRecord(existing);
        setDriverName(existing.driverName);
        setVehicleNumber(existing.vehicleNumber);
        setNote(existing.note);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Isian surat jalan gagal dimuat",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [docType, sourceType, sourceId]);

  const sourceData =
    database && source ? resolveDocumentSource(database, source) : null;
  const blockReason =
    database && source
      ? getDocumentBlockReason(database, source, docType)
      : "Data dokumen belum siap.";

  const invoiceView =
    database && sourceData && record && docType === "invoice"
      ? buildInvoiceView(database, sourceData, record)
      : null;
  const deliveryNoteView =
    database && sourceData && record && docType === "surat_jalan"
      ? buildDeliveryNoteView(database, sourceData, record)
      : null;

  function buildPayload() {
    if (!source) return null;

    return {
      docType,
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      ...(docType === "surat_jalan" && (fieldsDirty || record)
        ? { driverName, vehicleNumber, note }
        : {}),
    };
  }

  async function handlePreview() {
    if (busy || !source) return;

    if (blockReason) {
      setError(blockReason);
      return;
    }

    const payload = buildPayload();
    if (!payload) return;

    setBusy(true);
    setError("");

    try {
      const saved = await ensurePrintDocument(payload);
      setRecord(saved);
      if (docType === "surat_jalan") saveDeliveryNotePaper(paper);
      setStep("preview");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Dokumen gagal disiapkan",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handlePrint() {
    if (busy || !source || !sourceData) return;

    const payload = buildPayload();
    if (!payload) return;

    setBusy(true);
    setError("");

    try {
      const saved = await ensurePrintDocument(payload);
      setRecord(saved);
      logDocumentPrinted(saved, sourceData.sourceNumber);

      // Beri satu frame agar nomor/isian terbaru sempat masuk ke portal cetak.
      window.setTimeout(() => window.print(), 80);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Dokumen gagal dicetak",
      );
    } finally {
      setBusy(false);
    }
  }

  const title =
    docType === "invoice" ? "Cetak Invoice" : "Cetak Surat Jalan";
  const description =
    docType === "invoice"
      ? "Invoice A4 memakai nomor yang tersimpan agar cetak ulang tetap sama."
      : "Surat jalan tanpa harga. Pilih kertas dan isi data pengiriman bila perlu.";

  const printRoot =
    step === "preview" && record && (invoiceView || deliveryNoteView) &&
    typeof document !== "undefined"
      ? createPortal(
          <div id="document-print-root" className="hidden">
            <style>
              {buildPageSizeCss(docType === "invoice" ? "a4" : paper)}
            </style>
            {invoiceView ? <InvoiceDocument data={invoiceView} /> : null}
            {deliveryNoteView ? (
              <DeliveryNoteDocument data={deliveryNoteView} paper={paper} />
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          if (!busy) onClose();
        }}
        title={title}
        description={description}
        size="xl"
        footer={
          step === "form" ? (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={busy}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handlePreview}
                disabled={busy || Boolean(blockReason) || loadingExisting}
              >
                {busy ? "Menyiapkan…" : "Pratinjau"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                disabled={busy}
              >
                Kembali
              </Button>
              <Button
                variant="primary"
                onClick={handlePrint}
                disabled={busy}
              >
                {busy ? "Menyiapkan…" : "Cetak"}
              </Button>
            </>
          )
        }
      >
        {error ? (
          <p
            role="alert"
            className="mb-3 rounded-control border border-danger-line bg-danger-soft px-3 py-2 text-label font-semibold text-danger-ink"
          >
            {error}
          </p>
        ) : null}

        {step === "form" ? (
          <div className="flex flex-col gap-4">
            <dl className="grid gap-2 rounded-control border border-line bg-canvas p-3 text-label sm:grid-cols-2">
              <div>
                <dt className="text-ink-muted">Sumber</dt>
                <dd className="m-0 font-semibold text-ink">
                  {sourceData?.sourceNumber ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Pelanggan</dt>
                <dd className="m-0 font-semibold text-ink">
                  {sourceData?.party.name ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Nomor dokumen</dt>
                <dd className="m-0 font-semibold text-ink">
                  {record?.documentNumber ??
                    (docType === "invoice"
                      ? "Dibuat saat pratinjau"
                      : "Dibuat otomatis")}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Total</dt>
                <dd className="m-0 font-semibold text-ink">
                  {formatRupiah(sourceData?.total ?? 0)}
                </dd>
              </div>
            </dl>

            {blockReason ? (
              <p className="m-0 rounded-control border border-warning-soft bg-warning-soft px-3 py-2 text-label font-semibold text-warning-ink">
                {blockReason}
              </p>
            ) : null}

            {docType === "invoice" ? (
              <div className="rounded-control border border-line px-3 py-3">
                <p className="m-0 text-label font-semibold text-ink">
                  Kertas A4
                </p>
                <p className="mt-0.5 mb-0 text-meta text-ink-muted">
                  Invoice selalu memakai A4. Nomor dan tanggal disimpan saat
                  pratinjau pertama, jadi cetak ulang tidak menggandakan nomor.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                <fieldset className="m-0 border-0 p-0">
                  <legend className="mb-2 text-label font-semibold text-ink-soft">
                    Ukuran kertas
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-strong px-3 py-3">
                      <input
                        type="radio"
                        name="paper"
                        value="dot_matrix"
                        checked={paper === "dot_matrix"}
                        onChange={() => setPaper("dot_matrix")}
                        disabled={busy}
                        className="mt-0.5 h-4 w-4 accent-brand"
                      />
                      <span>
                        <span className="block text-label font-semibold text-ink">
                          Dot matrix 9,5 × 11 in
                        </span>
                        <span className="block text-meta text-ink-muted">
                          Hitam-putih, Courier, tanpa logo.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-strong px-3 py-3">
                      <input
                        type="radio"
                        name="paper"
                        value="a4"
                        checked={paper === "a4"}
                        onChange={() => setPaper("a4")}
                        disabled={busy}
                        className="mt-0.5 h-4 w-4 accent-brand"
                      />
                      <span>
                        <span className="block text-label font-semibold text-ink">
                          A4
                        </span>
                        <span className="block text-meta text-ink-muted">
                          Tampilan rapi untuk arsip atau pembeli.
                        </span>
                      </span>
                    </label>
                  </div>
                </fieldset>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Supir (opsional)" labelSize="sm">
                    <Input
                      value={driverName}
                      onChange={(event) => {
                        setDriverName(event.target.value);
                        setFieldsDirty(true);
                      }}
                      placeholder="Nama pengirim"
                      disabled={busy || loadingExisting}
                    />
                  </Field>
                  <Field label="No. polisi (opsional)" labelSize="sm">
                    <Input
                      value={vehicleNumber}
                      onChange={(event) => {
                        setVehicleNumber(event.target.value);
                        setFieldsDirty(true);
                      }}
                      placeholder="AE 1234 XX"
                      disabled={busy || loadingExisting}
                    />
                  </Field>
                  <Field
                    label="Catatan pengiriman (opsional)"
                    labelSize="sm"
                    className="sm:col-span-2"
                  >
                    <Textarea
                      value={note}
                      onChange={(event) => {
                        setNote(event.target.value);
                        setFieldsDirty(true);
                      }}
                      placeholder="Contoh: kirim pagi, hubungi penerima dulu"
                      rows={2}
                      disabled={busy || loadingExisting}
                    />
                  </Field>
                </div>

                <p className="m-0 text-meta text-ink-muted">
                  {loadingExisting
                    ? "Memuat isian surat jalan sebelumnya…"
                    : "Isian ini tersimpan pada surat jalan dan dipakai lagi saat cetak ulang."}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-control bg-neutral-200 p-2 sm:p-4">
            <div className="overflow-x-auto">
              {invoiceView ? <InvoiceDocument data={invoiceView} /> : null}
              {deliveryNoteView ? (
                <DeliveryNoteDocument data={deliveryNoteView} paper={paper} />
              ) : null}
            </div>
          </div>
        )}
      </Modal>
      {printRoot}
    </>
  );
}
