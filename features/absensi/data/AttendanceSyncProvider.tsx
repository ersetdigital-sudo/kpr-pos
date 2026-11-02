"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePermissions } from "@/features/session/data/session-repository";
import { syncAttendanceFromCloud } from "@/features/absensi/data/attendance-cloud";

interface AttendanceSyncProviderProps {
  children: ReactNode;
}

export function AttendanceSyncProvider({
  children,
}: AttendanceSyncProviderProps) {
  const permissions = usePermissions();

  useEffect(() => {
    let active = true;

    const sync = () => {
      if (!active) return;

      void syncAttendanceFromCloud({
        canBootstrap: permissions.canViewAllAttendance,
      }).catch((error) => {
        console.error("Sinkronisasi absensi gagal:", error);
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
  }, [permissions.canViewAllAttendance]);

  return children;
}
