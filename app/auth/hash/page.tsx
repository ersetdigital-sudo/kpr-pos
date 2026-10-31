"use client";

import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function safeNext(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}

export default function AuthHashPage() {
  const [message, setMessage] = useState("Membuka sesi undangan…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      try {
        const search = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(
          window.location.hash.replace(/^#/, ""),
        );
        const type = search.get("type") ?? hash.get("type");
        const fallback = type === "invite" ? "/set-password" : "/dashboard";
        const next = safeNext(search.get("next") ?? hash.get("next"), fallback);
        const supabase = createSupabaseBrowserClient();

        const accessToken =
          hash.get("access_token") ?? search.get("access_token");
        const refreshToken =
          hash.get("refresh_token") ?? search.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          const code = search.get("code");
          const tokenHash = search.get("token_hash");

          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
          } else if (
            tokenHash &&
            (type === "invite" || type === "email" || type === "recovery")
          ) {
            const { error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type,
            });
            if (error) throw error;
          } else {
            throw new Error("Token tidak ditemukan");
          }
        }

        if (!cancelled) {
          window.location.replace(next);
        }
      } catch {
        if (!cancelled) {
          setMessage("Tautan undangan tidak valid atau sudah kedaluwarsa.");
          window.setTimeout(() => {
            window.location.replace("/login?error=auth");
          }, 1200);
        }
      }
    }

    void finish();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthShell title="Undangan Akun" description={message}>
      <div className="rounded-control border border-line bg-canvas px-4 py-3 text-center text-label text-ink-muted">
        Mohon tunggu sebentar…
      </div>
    </AuthShell>
  );
}
