"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePermissions } from "@/features/session/data/session-repository";
import { syncSalesFromCloud } from "@/features/sales/data/sales-cloud";

interface SalesSyncProviderProps {
  children: ReactNode;
}

export function SalesSyncProvider({ children }: SalesSyncProviderProps) {
  const permissions = usePermissions();

  useEffect(() => {
    let active = true;

    const sync = () => {
      if (!active) return;

      void syncSalesFromCloud({
        canBootstrap: permissions.canManageSalesOrders,
      }).catch((error) => {
        console.error("Sinkronisasi transaksi/pesanan gagal:", error);
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
  }, [permissions.canManageSalesOrders]);

  return children;
}
