"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePermissions } from "@/features/session/data/session-repository";
import { syncActivityFromCloud } from "@/features/activity/data/activity-cloud";

interface ActivitySyncProviderProps {
  children: ReactNode;
}

export function ActivitySyncProvider({ children }: ActivitySyncProviderProps) {
  const permissions = usePermissions();

  useEffect(() => {
    let active = true;

    const sync = () => {
      if (!active) return;

      void syncActivityFromCloud({
        canBootstrap: permissions.canExportReports,
      }).catch((error) => {
        console.error("Sinkronisasi log aktivitas gagal:", error);
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };

    sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [permissions.canExportReports]);

  return children;
}
