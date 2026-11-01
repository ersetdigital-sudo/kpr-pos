"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { changeOwnPasswordAction } from "@/features/auth/actions";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const { showToast } = useToast();
  const [state, formAction, pending] = useActionState(
    changeOwnPasswordAction,
    {},
  );

  useEffect(() => {
    if (!state.success) return;

    showToast("Password berhasil diganti", "success");
    onClose();
  }, [state.success, onClose, showToast]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ganti Password"
      description="Masukkan password saat ini, lalu tentukan password baru."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="change-password-form"
            disabled={pending}
          >
            {pending ? "Menyimpan…" : "Simpan Password"}
          </Button>
        </>
      }
    >
      <form
        id="change-password-form"
        action={formAction}
        className="flex flex-col gap-3.5"
      >
        <Field label="Password saat ini" labelSize="sm">
          <Input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="Password sekarang"
            required
            autoFocus
          />
        </Field>

        <Field label="Password baru" labelSize="sm">
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            required
          />
        </Field>

        <Field label="Ulangi password baru" labelSize="sm">
          <Input
            name="confirmation"
            type="password"
            autoComplete="new-password"
            placeholder="Ulangi password baru"
            required
          />
        </Field>

        {state?.error ? (
          <p className="m-0 rounded-control bg-danger-soft px-3 py-2 text-label font-semibold text-danger-ink">
            {state.error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
