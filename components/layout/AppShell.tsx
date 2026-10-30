"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AccessDenied } from "@/components/layout/AccessDenied";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarContext } from "@/components/layout/sidebar-context";
import { ToastProvider } from "@/components/ui/Toast";
import { canAccessPath } from "@/config/navigation";
import { useSession } from "@/features/session/data/session-repository";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { employee } = useSession();
  const allowed = canAccessPath(pathname, employee.role);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const contextValue = useMemo(() => ({ openSidebar }), [openSidebar]);

  // Kunci scroll halaman dan izinkan Escape selama drawer mobile terbuka.
  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sidebarOpen]);

  return (
    <SidebarContext.Provider value={contextValue}>
      <ToastProvider>
        <div className="flex min-h-screen bg-canvas text-ink">
          <Sidebar open={sidebarOpen} onClose={closeSidebar} />
          <div className="flex min-w-0 flex-1 flex-col">
            {allowed ? children : <AccessDenied />}
          </div>
        </div>
      </ToastProvider>
    </SidebarContext.Provider>
  );
}
