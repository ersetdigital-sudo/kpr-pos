import { Avatar } from "@/components/ui/Avatar";
import type { Employee } from "@/lib/store/types";

interface UserBadgeProps {
  user: Pick<Employee, "name" | "role" | "initials">;
}

export function UserBadge({ user }: UserBadgeProps) {
  return (
    <div className="flex items-center gap-[10px] pl-1.5">
      <Avatar initials={user.initials} />
      <div>
        <div className="text-body font-semibold text-ink">{user.name}</div>
        <div className="text-meta text-ink-muted">{user.role}</div>
      </div>
    </div>
  );
}
