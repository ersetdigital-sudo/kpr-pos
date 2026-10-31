"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { loginAction } from "@/features/auth/actions";

interface LoginFormProps {
  initialError?: string;
}

export function LoginForm({ initialError }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, {
    error: initialError,
  });

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <Field label="Email" labelSize="sm">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@perusahaan.com"
          required
        />
      </Field>

      <Field label="Password" labelSize="sm">
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
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
        {pending ? "Memproses…" : "Masuk"}
      </Button>
    </form>
  );
}
