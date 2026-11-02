"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePermissions } from "@/features/session/data/session-repository";
import { syncProductStockFromCloud } from "@/features/produk/data/produk-cloud";

interface ProductStockSyncProviderProps {
  children: ReactNode;
}

export function ProductStockSyncProvider({
  children,
}: ProductStockSyncProviderProps) {
  const permissions = usePermissions();

  useEffect(() => {
    let active = true;

    const sync = () => {
      if (!active) return;

      void syncProductStockFromCloud({
        canBootstrap: permissions.canManageProducts,
      }).catch((error) => {
        console.error("Sinkronisasi produk/stok gagal:", error);
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
  }, [permissions.canManageProducts]);

  return children;
}
