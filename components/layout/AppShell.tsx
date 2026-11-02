"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AccessDenied } from "@/components/layout/AccessDenied";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarContext } from "@/components/layout/sidebar-context";
import { ToastProvider } from "@/components/ui/Toast";
import { canAccessPath } from "@/config/navigation";
import { useSession } from "@/features/session/data/session-repository";
import { cn } from "@/lib/cn";

const SIDEBAR_STORAGE_KEY = "kpr-sidebar-collapsed";
const SIDEBAR_EVENT = "kpr-sidebar-change";

function subscribeSidebar(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_EVENT, callback);
  };
}

function getSidebarCollapsed() {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarCollapsed,
    () => false,
  );
  const pathname = usePathname();
  const { permissions } = useSession();
  const allowed = canAccessPath(pathname, permissions);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const contextValue = useMemo(() => ({ openSidebar }), [openSidebar]);

  const toggleCollapsed = useCallback(() => {
    const next = !getSidebarCollapsed();
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  }, []);

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
          <Sidebar
            open={sidebarOpen}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={toggleCollapsed}
            onClose={closeSidebar}
          />
          <div
            className={cn(
              "flex min-w-0 flex-1 flex-col transition-[margin] duration-200",
              sidebarCollapsed ? "lg:ml-20" : "lg:ml-[260px]",
            )}
          >
            {allowed ? children : <AccessDenied />}
          </div>
        </div>
      </ToastProvider>
    </SidebarContext.Provider>
  );
}
