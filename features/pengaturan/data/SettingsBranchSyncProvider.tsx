"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePermissions } from "@/features/session/data/session-repository";
import { syncSettingsBranchFromCloud } from "@/features/pengaturan/data/settings-cloud";
import { syncProductStockFromCloud } from "@/features/produk/data/produk-cloud";

interface SettingsBranchSyncProviderProps {
  children: ReactNode;
}

export function SettingsBranchSyncProvider({
  children,
}: SettingsBranchSyncProviderProps) {
  const permissions = usePermissions();

  useEffect(() => {
    let active = true;

    const sync = () => {
      if (!active) return;

      void syncSettingsBranchFromCloud({
        canBootstrap: permissions.canManageSettings,
      })
        .then(({ bootstrapped }) => {
          if (bootstrapped) {
            return syncProductStockFromCloud({ force: true });
          }
          return undefined;
        })
        .catch((error) => {
          console.error("Sinkronisasi pengaturan/cabang gagal:", error);
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
  }, [permissions.canManageSettings]);

  return children;
}
