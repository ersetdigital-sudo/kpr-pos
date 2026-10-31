"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { updatePasswordAction } from "@/features/auth/actions";

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <Field label="Password baru" labelSize="sm">
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          required
        />
      </Field>

      <Field label="Ulangi password" labelSize="sm">
        <Input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          placeholder="Ulangi password"
          required
        />
      </Field>

      {state?.error ? (
        <p className="m-0 rounded-control bg-danger-soft px-3 py-2 text-label font-semibold text-danger-ink">
          {state.error}
        </p>
      ) : null}

      <Button
        variant="primary"
        size="lg"
        type="submit"
        disabled={pending}
        className="w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Menyimpan…" : "Simpan Password"}
      </Button>
    </form>
  );
}
