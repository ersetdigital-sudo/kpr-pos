"use client";

import { useHydratedDatabase } from "@/lib/store/store";
import type { AppDatabase } from "@/lib/store/types";

/** Data laporan; null sampai store ter-hydrate agar rentang tanggal aman. */
export function useLaporanData(): AppDatabase | null {
  return useHydratedDatabase();
}
