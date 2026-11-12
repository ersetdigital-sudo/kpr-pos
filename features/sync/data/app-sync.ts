"use client";

import { EMPTY_SETTINGS, createEmptyDatabase } from "@/lib/store/defaults";
import { primeDatabase, updateDatabase } from "@/lib/store/store";
import type { AppDatabase } from "@/lib/store/types";
import { fetchAppSnapshotAction } from "@/features/sync/cloud-actions";
import type { AppSnapshot } from "@/features/sync/types";

/** Jeda minimal sync latar belakang (focus/visibility) dalam milidetik. */
export const SYNC_MIN_INTERVAL_MS = 60_000;

let lastSyncAt = 0;
let inFlight: Promise<void> | null = null;
let writeDepth = 0;

/** True selama aksi tulis (kasir, stok, pengaturan, dst) masih berjalan. */
export function isCloudWriteInFlight(): boolean {
  return writeDepth > 0;
}

/** Tandai aksi tulis agar sync latar tidak ikut berjalan di tengahnya. */
export async function trackCloudWrite<T>(work: () => Promise<T>): Promise<T> {
  writeDepth += 1;

  try {
    return await work();
  } finally {
    writeDepth -= 1;
  }
}

function snapshotToDatabase(
  snapshot: AppSnapshot,
  current: AppDatabase,
): AppDatabase {
  return {
    schemaVersion: 3,
    branches: snapshot.branches,
    employees: snapshot.employees,
    categories: snapshot.categories,
    products: snapshot.products,
    stocks: snapshot.stocks,
    stockIns: snapshot.stockIns,
    stockOpnames: snapshot.stockOpnames,
    stockTransfers: snapshot.stockTransfers,
    transactions: snapshot.transactions,
    drafts: snapshot.drafts,
    salesOrders: snapshot.salesOrders,
    attendance: snapshot.attendance,
    leaveRequests: snapshot.leaveRequests,
    kasbon: snapshot.kasbon ?? [],
    activityLogs: snapshot.activityLogs,
    // Snapshot tanpa baris settings tidak boleh menghapus pengaturan tampilan.
    settings: snapshot.settings ?? current.settings ?? EMPTY_SETTINGS,
    session: snapshot.session,
  };
}

/**
 * Isi cache sebelum render pertama. Tidak memicu listener dan sekaligus
 * menandai waktu sync agar event focus berikutnya tidak langsung menembak.
 */
export function primeDatabaseFromSnapshot(snapshot: AppSnapshot): void {
  primeDatabase(snapshotToDatabase(snapshot, createEmptyDatabase()));
  lastSyncAt = Date.now();
}

const primedSnapshots = new WeakSet<AppSnapshot>();

/** Priming idempoten per objek snapshot (aman dipanggil saat render). */
export function primeDatabaseFromSnapshotOnce(snapshot: AppSnapshot): void {
  if (primedSnapshots.has(snapshot)) return;

  primedSnapshots.add(snapshot);
  primeDatabaseFromSnapshot(snapshot);
}

function applySnapshot(snapshot: AppSnapshot): void {
  updateDatabase((database) => snapshotToDatabase(snapshot, database));
  lastSyncAt = Date.now();
}

interface SyncOptions {
  /** Lewati throttle (dipakai tepat setelah aksi tulis). */
  force?: boolean;
}

/**
 * Tarik snapshot cloud terbaru. Tanpa `force`, sync dilewati bila masih di
 * bawah jeda 60 detik atau ada aksi tulis yang sedang berjalan.
 */
export function syncAppFromCloud(options: SyncOptions = {}): Promise<void> {
  if (inFlight) {
    if (!options.force) return inFlight;

    return inFlight
      .catch(() => undefined)
      .then(() => syncAppFromCloud({ force: true }));
  }

  if (!options.force) {
    if (isCloudWriteInFlight()) return Promise.resolve();
    if (Date.now() - lastSyncAt < SYNC_MIN_INTERVAL_MS) return Promise.resolve();
  }

  inFlight = fetchAppSnapshotAction()
    .then(applySnapshot)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
