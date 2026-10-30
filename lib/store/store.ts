"use client";

import { useSyncExternalStore } from "react";
import { createSeedDatabase, DEFAULT_SALES_BONUS } from "@/lib/store/seed";
import type {
  AppDatabase,
  SalesOrder,
  StoreSettings,
} from "@/lib/store/types";

export const DB_STORAGE_KEY = "kpr-pos-db-v1";

const SERVER_SNAPSHOT = createSeedDatabase();
const listeners = new Set<() => void>();

let clientSnapshot: AppDatabase | null = null;
let storageListenerAttached = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

/**
 * Menormalkan data tersimpan. Data fase 1 (schemaVersion 1) dimigrasikan ke v2
 * tanpa menghapus transaksi/draft milik pengguna.
 */
function normalizeDatabase(value: unknown): AppDatabase | null {
  if (!isRecord(value)) return null;

  const version = value.schemaVersion;
  const coreArrays = [
    "branches",
    "employees",
    "categories",
    "products",
    "stocks",
    "transactions",
    "drafts",
    "salesOrders",
    "attendance",
    "activityLogs",
  ];

  if (
    typeof version !== "number" ||
    version < 1 ||
    version > 2 ||
    coreArrays.some((key) => !Array.isArray(value[key])) ||
    !isRecord(value.settings) ||
    !isRecord(value.session) ||
    typeof value.session.currentEmployeeId !== "string" ||
    typeof value.session.activeBranchId !== "string"
  ) {
    return null;
  }

  const database = value as unknown as AppDatabase;
  const settings = database.settings as StoreSettings;

  return {
    ...database,
    schemaVersion: 2,
    products: database.products.map((product) => ({
      ...product,
      imageUrl: product.imageUrl || undefined,
    })),
    stockIns: Array.isArray(database.stockIns) ? database.stockIns : [],
    stockOpnames: Array.isArray(database.stockOpnames)
      ? database.stockOpnames
      : [],
    stockTransfers: Array.isArray(database.stockTransfers)
      ? database.stockTransfers
      : [],
    salesOrders: database.salesOrders.map((order) => ({
      ...order,
      // Pesanan lunas dari v1 dianggap sudah memotong stok saat dibuat.
      stockApplied:
        typeof order.stockApplied === "boolean"
          ? order.stockApplied
          : order.status === "Lunas",
    })) as SalesOrder[],
    settings: {
      ...settings,
      salesBonus: settings.salesBonus ?? DEFAULT_SALES_BONUS,
    },
  };
}

function loadDatabase(): AppDatabase {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;

  try {
    const raw = window.localStorage.getItem(DB_STORAGE_KEY);

    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      const normalized = normalizeDatabase(parsed);

      if (normalized) {
        return normalized;
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
