"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { syncEmployeesFromCloud } from "@/features/karyawan/data/employee-cloud";

interface EmployeeSyncProviderProps {
  children: ReactNode;
}

export function EmployeeSyncProvider({ children }: EmployeeSyncProviderProps) {
  useEffect(() => {
    let active = true;

    const sync = () => {
      if (!active) return;

      void syncEmployeesFromCloud().catch((error) => {
        console.error("Sinkronisasi karyawan gagal:", error);
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
  }, []);

  return children;
}
