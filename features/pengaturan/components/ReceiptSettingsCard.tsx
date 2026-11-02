"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { ReceiptPaper } from "@/features/kasir/components/ReceiptPaper";
import { updateReceiptSettings } from "@/features/pengaturan/data/pengaturan-repository";
import type { ReceiptViewData } from "@/features/kasir/types";
import type { ReceiptPaperSize, ReceiptSettings } from "@/lib/store/types";
import { cn } from "@/lib/cn";

interface ReceiptSettingsCardProps {
  settings: ReceiptSettings;
  preview: ReceiptViewData;
}

export function ReceiptSettingsCard({
  settings,
  preview,
}: ReceiptSettingsCardProps) {
  const { showToast } = useToast();
  const [paperSize, setPaperSize] = useState<ReceiptPaperSize>(
    settings.paperSize,
  );
  const [footerText, setFooterText] = useState(settings.footerText);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const previewReceipt: ReceiptViewData = {
    ...preview,
    paperSize,
    footerText,
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);

    try {
      await updateReceiptSettings({ paperSize, footerText });
      showToast(`Pengaturan struk ${paperSize}mm disimpan`, "success");
      setError("");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Struk gagal disimpan";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="m-0 text-card-title font-bold text-ink">Struk</h2>
          <p className="mt-0.5 mb-0 text-label text-ink-muted">
            Ukuran kertas dan teks penutup pada struk kasir.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <span className="text-label font-semibold text-ink-soft">
              Ukuran kertas
            </span>
            <div className="flex gap-2">
              {([58, 80] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={paperSize === size}
                  onClick={() => setPaperSize(size)}
                  className={cn(
                    "h-10 flex-1 cursor-pointer rounded-control border font-sans text-label font-semibold",
                    paperSize === size
                      ? "border-brand bg-brand-soft text-brand-strong"
                      : "border-line-strong bg-surface text-ink-muted",
                  )}
                >
                  {size}mm
                </button>
              ))}
            </div>
          </div>

          <Field label="Teks footer" labelSize="sm">
            <Textarea
              value={footerText}
              onChange={(event) => setFooterText(event.target.value)}
              rows={3}
              className="text-label"
            />
          </Field>

          {error ? (
            <p className="m-0 text-label font-semibold text-danger-ink">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setPreviewOpen(true)}
              disabled={saving}
            >
              Preview Struk
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan Struk"}
            </Button>
          </div>
        </form>
      </Card>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Preview Struk"
        description={`Ukuran ${paperSize}mm · contoh transaksi`}
        size="md"
        footer={
          <Button variant="outline" onClick={() => setPreviewOpen(false)}>
            Tutup
          </Button>
        }
      >
        <div className="flex justify-center bg-canvas p-3">
          <ReceiptPaper receipt={previewReceipt} />
        </div>
      </Modal>
    </>
  );
}
