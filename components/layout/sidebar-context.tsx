"use client";

import { createContext, useContext } from "react";

interface SidebarContextValue {
  openSidebar: () => void;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar harus dipakai di dalam AppShell");
  }

  return context;
}
