import {
  bootstrapActivityAction,
  fetchActivitySnapshotAction,
} from "@/features/activity/cloud-actions";
import {
  getDatabase,
  hasStoredDatabase,
  updateDatabase,
} from "@/lib/store/store";
import type {
  ActivityBootstrapPayload,
  ActivitySnapshot,
} from "@/lib/cloud/attendance-types";
import type { ActivityLog } from "@/lib/store/types";

let inFlight: Promise<{ bootstrapped: boolean }> | null = null;

function buildBootstrapPayload(
  logs: readonly ActivityLog[],
): ActivityBootstrapPayload {
  return {
    activity_logs: logs.map((log) => ({
      id: log.id,
      at: log.at,
      user_id: log.userId,
      user_name: log.userName,
      role: log.role,
      branch_id: log.branchId,
      action: log.action,
      detail: log.detail,
    })),
  };
}

function mergeLogs(
  localLogs: readonly ActivityLog[],
  cloudLogs: readonly ActivityLog[],
): ActivityLog[] {
  const byId = new Map<string, ActivityLog>();
  [...cloudLogs, ...localLogs].forEach((log) => byId.set(log.id, log));

  return [...byId.values()]
    .sort((first, second) => new Date(second.at).getTime() - new Date(first.at).getTime())
    .slice(0, 200);
}

function applySnapshot(snapshot: ActivitySnapshot, merge: boolean): void {
  updateDatabase((database) => ({
    ...database,
    activityLogs: merge
      ? mergeLogs(database.activityLogs, snapshot.activityLogs)
      : snapshot.activityLogs,
  }));
}

interface SyncOptions {
  canBootstrap?: boolean;
  force?: boolean;
}

export function syncActivityFromCloud(
  options: SyncOptions = {},
): Promise<{ bootstrapped: boolean }> {
  if (inFlight) {
    if (!options.force) return inFlight;

    return inFlight
      .catch(() => undefined)
      .then(() => syncActivityFromCloud({ ...options, force: false }));
  }

  inFlight = (async () => {
    let snapshot = await fetchActivitySnapshotAction();
    const stored = hasStoredDatabase();
    let bootstrapped = false;

    if (snapshot.isEmpty && options.canBootstrap && stored) {
      const localLogs = getDatabase().activityLogs;
      if (localLogs.length > 0) {
        const result = await bootstrapActivityAction(
          buildBootstrapPayload(localLogs),
        );
        if (!result.ok) throw new Error(result.error);
        bootstrapped = result.bootstrapped;
        snapshot = await fetchActivitySnapshotAction();
      }
    }

    if (!snapshot.isEmpty) {
      applySnapshot(snapshot, stored);
    } else if (!stored) {
      applySnapshot(snapshot, false);
    }

    return { bootstrapped };
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
