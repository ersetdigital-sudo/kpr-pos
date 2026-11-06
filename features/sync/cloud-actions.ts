"use server";

import { getReadSession } from "@/lib/auth/session";
import { readAppSnapshot } from "@/features/sync/data/app-snapshot";
import type { AppSnapshot } from "@/features/sync/types";

/**
 * Satu-satunya pintu sync: seluruh snapshot diambil lewat satu server action
 * yang query-nya paralel, bukan enam action terpisah yang saling mengantre.
 */
export async function fetchAppSnapshotAction(): Promise<AppSnapshot> {
  const session = await getReadSession();
  if (!session) throw new Error("Sesi pengguna tidak ditemukan");

  return readAppSnapshot(session);
}
