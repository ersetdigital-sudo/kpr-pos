"use client";

import { useSyncExternalStore } from "react";
import { createEmptyDatabase } from "@/lib/store/defaults";
import type { AppDatabase } from "@/lib/store/types";

const SERVER_SNAPSHOT = createEmptyDatabase();
const listeners = new Set<() => void>();

let clientSnapshot: AppDatabase | null = null;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Mengisi cache dari snapshot cloud sebelum render pertama. Tidak memicu
 * listener karena dipanggil saat provider belum me-render anak-anaknya.
 */
export function primeDatabase(database: AppDatabase): AppDatabase {
  clientSnapshot = database;
  return database;
}

export function getDatabase(): AppDatabase {
  return clientSnapshot ?? SERVER_SNAPSHOT;
}

export function useDatabase(): AppDatabase {
  return useSyncExternalStore(subscribe, getDatabase, () => SERVER_SNAPSHOT);
}

/**
 * Versi yang bernilai null sampai store ter-hydrate di browser. Dipakai untuk
 * nilai yang bergantung pada waktu nyata agar tidak ikut prerender.
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
  emitChange();

  return next;
}

/** Mengosongkan cache tampilan; data berikutnya selalu datang dari cloud. */
export function resetDatabaseCache(): void {
  clientSnapshot = createEmptyDatabase();
  emitChange();
}
