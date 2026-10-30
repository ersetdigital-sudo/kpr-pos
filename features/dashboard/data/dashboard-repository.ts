"use client";

import { useHydratedDatabase } from "@/lib/store/store";
import type { AppDatabase } from "@/lib/store/types";

/** Data dashboard; null sampai store ter-hydrate agar tanggal tidak ikut prerender. */
export function useDashboardData(): AppDatabase | null {
  return useHydratedDatabase();
}
