"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import {
  primeDatabaseFromSnapshotOnce,
  syncAppFromCloud,
} from "@/features/sync/data/app-sync";
import type { AppSnapshot } from "@/features/sync/types";

interface AppSyncProviderProps {
  initialSnapshot: AppSnapshot;
  children: ReactNode;
}

function subscribeNoop() {
  return () => {};
}

/**
 * Satu-satunya koordinator data:
 * - snapshot awal dikirim server pada render pertama (tanpa round-trip),
 * - sync ulang hanya lewat satu action, di-throttle 60 detik saat focus,
 * - sync latar tidak berjalan saat ada aksi tulis.
 */
export function AppSyncProvider({
  initialSnapshot,
  children,
}: AppSyncProviderProps) {
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  if (isClient) {
    primeDatabaseFromSnapshotOnce(initialSnapshot);
  }

  useEffect(() => {
    if (!isClient) return;

    const sync = () => {
      void syncAppFromCloud().catch((error) => {
        console.error("Sinkronisasi data gagal:", error);
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };

    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isClient]);

  if (!isClient) return null;

  return children;
}
