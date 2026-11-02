import {
  bootstrapSettingsBranchAction,
  fetchSettingsBranchSnapshotAction,
} from "@/features/pengaturan/cloud-actions";
import {
  getDatabase,
  hasStoredDatabase,
  updateDatabase,
} from "@/lib/store/store";
import type { AppDatabase } from "@/lib/store/types";
import type {
  SettingsBranchBootstrapPayload,
  SettingsBranchSnapshot,
} from "@/features/pengaturan/types";

let inFlight: Promise<{ bootstrapped: boolean }> | null = null;

function buildBootstrapPayload(
  database: AppDatabase,
): SettingsBranchBootstrapPayload {
  return {
    settings: database.settings,
    branches: database.branches,
  };
}

function applySnapshot(snapshot: SettingsBranchSnapshot): void {
  if (!snapshot.settings) return;

  updateDatabase((database) => ({
    ...database,
    settings: snapshot.settings as AppDatabase["settings"],
    branches:
      snapshot.branches.length > 0 ? snapshot.branches : database.branches,
  }));
}

interface SyncOptions {
  canBootstrap?: boolean;
  force?: boolean;
}

/**
 * Tarik pengaturan dan cabang dari Supabase. Perangkat yang sudah punya data
 * mengunggah pengaturan/cabang lokalnya sekali sebagai bootstrap.
 */
export function syncSettingsBranchFromCloud(
  options: SyncOptions = {},
): Promise<{ bootstrapped: boolean }> {
  if (inFlight) {
    if (!options.force) return inFlight;

    return inFlight
      .catch(() => undefined)
      .then(() =>
        syncSettingsBranchFromCloud({ ...options, force: false }),
      );
  }

  inFlight = (async () => {
    let snapshot = await fetchSettingsBranchSnapshotAction();
    let bootstrapped = false;

    if (!snapshot.settings) {
      const database = getDatabase();

      if (options.canBootstrap && hasStoredDatabase()) {
        const result = await bootstrapSettingsBranchAction(
          buildBootstrapPayload(database),
        );

        if (!result.ok) throw new Error(result.error);

        bootstrapped = result.bootstrapped;
        snapshot = await fetchSettingsBranchSnapshotAction();
      }
    }

    applySnapshot(snapshot);
    return { bootstrapped };
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
