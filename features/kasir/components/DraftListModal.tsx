"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { formatDateTimeShort, formatRupiah } from "@/lib/format";
import type { DraftSummary } from "@/features/kasir/types";

interface DraftListModalProps {
  open: boolean;
  drafts: readonly DraftSummary[];
  onClose: () => void;
  onOpenDraft: (draftId: string) => void;
  onDeleteDraft: (draftId: string) => void;
}

export function DraftListModal({
  open,
  drafts,
  onClose,
  onOpenDraft,
  onDeleteDraft,
}: DraftListModalProps) {
  const [pendingDelete, setPendingDelete] = useState<DraftSummary | null>(null);

  function handleClose() {
    setPendingDelete(null);
    onClose();
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title="Draft Keranjang"
        description={`${drafts.length} draft tersimpan di cabang aktif`}
        footer={
          <Button variant="outline" onClick={handleClose}>
            Tutup
          </Button>
        }
      >
        {drafts.length === 0 ? (
          <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-8 text-center">
            <p className="m-0 text-body font-semibold text-ink">
              Belum ada draft
            </p>
            <p className="mt-1 mb-0 text-meta text-ink-muted">
              Keranjang yang disimpan akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {drafts.map((item) => (
              <div
                key={item.draft.id}
                className="rounded-card border border-line p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-body font-semibold text-ink">
                      {item.draft.label}
                    </div>
                    <div className="text-meta text-ink-muted">
                      {item.cashierName} ·{" "}
                      {formatDateTimeShort(item.draft.updatedAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-body font-bold text-ink">
                      {formatRupiah(item.total)}
                    </div>
                    <div className="text-meta text-ink-muted">
                      {item.itemCount} item
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenDraft(item.draft.id)}
                  >
                    Buka
                  </Button>
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    onClick={() => setPendingDelete(item)}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus draft?"
        description={
          pendingDelete
            ? `Draft "${pendingDelete.draft.label}" akan dihapus permanen.`
            : ""
        }
        confirmLabel="Hapus draft"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDeleteDraft(pendingDelete.draft.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
