import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNext(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const fallback = type === "invite" ? "/set-password" : "/dashboard";
  const next = safeNext(searchParams.get("next"), fallback);

  const supabase = await createSupabaseServerClient();
  let failed = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (
    tokenHash &&
    (type === "invite" || type === "email" || type === "recovery")
  ) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    failed = Boolean(error);
  } else {
    failed = true;
  }

  if (failed) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
