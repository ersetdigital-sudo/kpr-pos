"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type DrawerSize = "sm" | "md" | "lg";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: DrawerSize;
  children?: ReactNode;
  footer?: ReactNode;
}

const SIZE_CLASSES: Record<DrawerSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
}: DrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-ink/50"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "flex h-full w-full flex-col overflow-hidden bg-surface shadow-xl outline-none",
          SIZE_CLASSES[size],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2
              id={titleId}
              className="m-0 text-card-title font-bold text-ink"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 mb-0 text-label text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-control border-0 bg-transparent text-ink-muted"
          >
            <Icon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
