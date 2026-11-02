import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ServiceRpcResult<T> =
  | { ok: true; data: T | null }
  | { ok: false; error: string };

export async function callServiceRpc<T = unknown>(
  name: string,
  args: Record<string, unknown>,
): Promise<ServiceRpcResult<T>> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc(name, args);

    if (error) {
      console.error(`[cloud-actions] RPC ${name} gagal`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return { ok: false, error: error.message };
    }

    return { ok: true, data: (data ?? null) as T | null };
  } catch (error) {
    console.error(`[cloud-actions] RPC ${name} terputus`, error);
    return {
      ok: false,
      error:
        error instanceof Error && error.message
          ? error.message
          : "Layanan data belum siap. Coba lagi.",
    };
  }
}
