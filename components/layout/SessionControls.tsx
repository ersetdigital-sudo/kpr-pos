"use client";

import { Chip } from "@/components/ui/Chip";
import {
  useSession,
  useSetActiveBranch,
} from "@/features/session/data/session-repository";

export function SessionControls() {
  const { branch, branches, isOwner } = useSession();
  const setActiveBranch = useSetActiveBranch();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isOwner ? (
        <label className="flex h-10 items-center gap-2 rounded-control border border-line-strong bg-surface px-3">
          <span className="text-meta whitespace-nowrap text-ink-muted">
            Cabang
          </span>
          <select
            aria-label="Cabang aktif"
            value={branch.id}
            onChange={(event) => setActiveBranch(event.target.value)}
            className="h-full max-w-[150px] cursor-pointer border-0 bg-transparent font-sans text-label font-semibold text-ink outline-none"
          >
            {branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <Chip tone="neutral">{branch.name}</Chip>
      )}
    </div>
  );
}
