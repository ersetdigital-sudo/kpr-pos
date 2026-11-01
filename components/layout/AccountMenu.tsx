"use client";

import { useEffect, useRef, useState } from "react";
import { ChangePasswordModal } from "@/components/layout/ChangePasswordModal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { logoutAction } from "@/features/auth/actions";
import { useSession } from "@/features/session/data/session-repository";

export function AccountMenu() {
  const { employee, branch } = useSession();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex cursor-pointer items-center gap-[10px] rounded-control border-0 bg-transparent py-1 pr-1 pl-1.5 text-left font-sans"
      >
        <Avatar initials={employee.initials} />
        <div>
          <div className="text-body font-semibold text-ink">{employee.name}</div>
          <div className="text-meta text-ink-muted">{employee.role}</div>
        </div>
        <Icon
          name="chevronDown"
          size={16}
          strokeWidth={2}
          className="text-ink-muted"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-[calc(100%+8px)] right-0 z-50 w-60 rounded-card border border-line bg-surface p-3 shadow-lg"
        >
          <div className="border-b border-line px-1 pb-2.5">
            <div className="text-body font-semibold text-ink">
              {employee.name}
            </div>
            <div className="text-meta text-ink-muted">{employee.role}</div>
            <div className="mt-1 text-meta text-ink-muted">{branch.name}</div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setPasswordOpen(true);
            }}
            className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-control border-0 bg-transparent px-2 py-2 text-left font-sans text-body text-ink hover:bg-line-subtle"
          >
            <Icon name="settings" size={16} strokeWidth={2} />
            Ganti password
          </button>

          <form action={logoutAction} className="pt-1">
            <Button
              variant="outline"
              size="sm"
              type="submit"
              className="w-full"
            >
              Keluar
            </Button>
          </form>
        </div>
      ) : null}

      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}
