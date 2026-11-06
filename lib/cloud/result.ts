export type CloudActionResult =
  | { ok: true }
  | { ok: false; error: string };

export function cloudError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Layanan data belum siap. Coba lagi.";
}
