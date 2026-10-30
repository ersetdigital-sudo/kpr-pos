"use client";

import { useSyncExternalStore } from "react";
import { createSeedDatabase } from "@/lib/store/seed";
import type { AppDatabase } from "@/lib/store/types";

export const DB_STORAGE_KEY = "kpr-pos-db-v1";

const SERVER_SNAPSHOT = createSeedDatabase();
const listeners = new Set<() => void>();

let clientSnapshot: AppDatabase | null = null;
let storageListenerAttached = false;

function isAppDatabase(value: unknown): value is AppDatabase {
  if (!value || typeof value !== "object") return false;

  const database = value as Partial<AppDatabase>;

  return (
    database.schemaVersion === 1 &&
    Array.isArray(database.branches) &&
    Array.isArray(database.employees) &&
    Array.isArray(database.categories) &&
    Array.isArray(database.products) &&
    Array.isArray(database.stocks) &&
    Array.isArray(database.transactions) &&
    Array.isArray(database.drafts) &&
    Array.isArray(database.salesOrders) &&
    Array.isArray(database.attendance) &&
    Array.isArray(database.activityLogs) &&
    !!database.settings &&
    typeof database.session?.currentEmployeeId === "string" &&
    typeof database.session?.activeBranchId === "string"
  );
}

function loadDatabase(): AppDatabase {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;

  try {
    const raw = window.localStorage.getItem(DB_STORAGE_KEY);

    if (raw) {
      const parsed: unknown = JSON.parse(raw);

      if (isAppDatabase(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Data rusak atau localStorage diblokir: kembali ke data awal.
  }

  return createSeedDatabase();
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function attachStorageListener() {
  if (storageListenerAttached || typeof window === "undefined") return;

  storageListenerAttached = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== DB_STORAGE_KEY) return;

    clientSnapshot = null;
    emitChange();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  attachStorageListener();

  return () => {
    listeners.delete(listener);
  };
}

export function getDatabase(): AppDatabase {
  if (!clientSnapshot) {
    clientSnapshot = loadDatabase();
  }

  return clientSnapshot;
}

export function useDatabase(): AppDatabase {
  return useSyncExternalStore(subscribe, getDatabase, () => SERVER_SNAPSHOT);
}

/**
 * Versi yang bernilai null sampai store selesai di-hydrate di browser. Dipakai
 * untuk nilai yang bergantung pada waktu nyata agar tidak ikut prerender.
 */
export function useHydratedDatabase(): AppDatabase | null {
  return useSyncExternalStore(subscribe, getDatabase, () => null);
}

/** Satu-satunya pintu tulis store. Semua repository fitur memakai fungsi ini. */
export function updateDatabase(
  updater: (database: AppDatabase) => AppDatabase,
): AppDatabase {
  const next = updater(getDatabase());

  clientSnapshot = next;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Store tetap jalan di memori walau penyimpanan browser penuh/diblokir.
    }
  }

  emitChange();

  return next;
}
