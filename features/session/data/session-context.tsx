"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { ROLES } from "@/constants/roles";
import { updateDatabase, useDatabase } from "@/lib/store/store";
import type { Branch, Employee } from "@/lib/store/types";
import type { SessionState } from "@/features/session/types";

interface SessionActions {
  setBranch: (branchId: string) => void;
}

const SessionContext = createContext<SessionState | null>(null);
const SessionActionsContext = createContext<SessionActions | null>(null);

function mergeBranches(
  remoteBranches: readonly Branch[],
  localBranches: readonly Branch[],
): Branch[] {
  const localIds = new Set(localBranches.map((branch) => branch.id));

  return [
    ...localBranches,
    ...remoteBranches.filter((branch) => !localIds.has(branch.id)),
  ];
}

/** Sinkronkan sesi Auth ke store localStorage agar repository fitur ikut user ini. */
function syncSessionToLocalDatabase(
  employeeId: string,
  branch: Branch,
  employees: readonly Employee[],
  branches: readonly Branch[],
) {
  updateDatabase((database) => ({
    ...database,
    employees: employees.map((employee) => ({ ...employee })),
    branches: mergeBranches(branches, database.branches),
    session: {
      currentEmployeeId: employeeId,
      activeBranchId: branch.id,
    },
  }));
}

interface AuthSessionProviderProps {
  session: SessionState;
  children: ReactNode;
}

export function AuthSessionProvider({
  session: authSession,
  children,
}: AuthSessionProviderProps) {
  const database = useDatabase();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const localBranches = database.branches.filter((branch) => branch.isActive);
  const branches = mergeBranches(authSession.branches, localBranches);
  const storedBranchId =
    database.session.currentEmployeeId === authSession.employee.id
      ? database.session.activeBranchId
      : null;
  const preferredBranchId =
    authSession.employee.role === ROLES.OWNER
      ? (selectedBranchId ?? storedBranchId ?? authSession.branch.id)
      : authSession.employee.branchId;
  const branch =
    branches.find((item) => item.id === preferredBranchId) ??
    branches.find((item) => item.id === authSession.branch.id) ??
    branches[0] ??
    authSession.branch;

  const session = useMemo(
    () => ({ ...authSession, branch, branches }),
    [authSession, branch, branches],
  );

  const setBranch = useCallback(
    (branchId: string) => {
      if (authSession.employee.role !== ROLES.OWNER) return;

      const target = branches.find((item) => item.id === branchId);
      if (target) setSelectedBranchId(branchId);
    },
    [authSession.employee.role, branches],
  );

  useEffect(() => {
    syncSessionToLocalDatabase(
      authSession.employee.id,
      branch,
      authSession.employees,
      authSession.branches,
    );
  }, [
    authSession.employee.id,
    authSession.employees,
    authSession.branches,
    branch,
  ]);

  const actions = useMemo(() => ({ setBranch }), [setBranch]);

  return (
    <SessionContext.Provider value={session}>
      <SessionActionsContext.Provider value={actions}>
        {children}
      </SessionActionsContext.Provider>
    </SessionContext.Provider>
  );
}

export function useSessionContext(): SessionState | null {
  return useContext(SessionContext);
}

export function useSessionActions(): SessionActions {
  const actions = useContext(SessionActionsContext);

  if (!actions) {
    throw new Error("Aksi sesi harus dipakai di dalam AuthSessionProvider");
  }

  return actions;
}
