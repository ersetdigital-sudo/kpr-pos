"use client";

import { cn } from "@/lib/cn";
import type { BankAccount } from "@/lib/store/types";

interface TransferPaymentProps {
  accounts: readonly BankAccount[];
  selectedId: string;
  onSelect: (accountId: string) => void;
}

export function TransferPayment({
  accounts,
  selectedId,
  onSelect,
}: TransferPaymentProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-meta font-semibold text-ink-muted">
        Pilih rekening tujuan
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-3 py-4 text-center text-meta text-ink-muted">
          Belum ada rekening transfer di pengaturan.
        </div>
      ) : (
        <div
          role="radiogroup"
          aria-label="Rekening tujuan transfer"
          className="flex flex-col gap-2"
        >
          {accounts.map((account) => {
            const selected = account.id === selectedId;

            return (
              <button
                key={account.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(account.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-control border px-[10px] py-2 text-left font-sans",
                  selected
                    ? "border-brand bg-brand-soft"
                    : "border-line-strong bg-surface",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-label font-semibold text-ink">
                    {account.bankName}
                  </span>
                  <span className="block text-meta text-ink-muted">
                    {account.accountNumber} · {account.accountHolder}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 shrink-0 rounded-full border",
                    selected
                      ? "border-[5px] border-brand bg-surface"
                      : "border-line-strong",
                  )}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
