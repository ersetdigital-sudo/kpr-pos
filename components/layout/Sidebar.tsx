"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { NAV_SECTIONS, type NavItem } from "@/config/navigation";
import { logoutAction } from "@/features/auth/actions";
import { useSession } from "@/features/session/data/session-repository";
import { useDatabase } from "@/lib/store/store";
import { cn } from "@/lib/cn";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function isItemActive(item: NavItem, pathname: string): boolean {
  if (!item.href) return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { employee } = useSession();
  const { business } = useDatabase().settings;
  const sections = NAV_SECTIONS.map((section) => ({
    label: section.label,
    items: section.items.filter((item) =>
      item.roles.includes(employee.role),
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-ink/50 lg:hidden",
          open ? "block" : "hidden",
        )}
      />

      <aside
        aria-label="Menu utama"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-line bg-surface transition-transform duration-200 lg:z-40 lg:translate-x-0 lg:transition-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup menu navigasi"
          className="absolute top-2.5 right-2.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-control border-0 bg-transparent text-ink-muted lg:hidden"
        >
          <Icon name="close" size={18} strokeWidth={2} />
        </button>

        <nav className="sidebar-nav flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
          <div className="mb-3 flex items-center gap-2.5 border-b border-line px-2 pt-1 pr-9 pb-4 lg:pr-2">
            <Image
              src={business.logoUrl || "/logo-kpr.png"}
              alt={`Logo ${business.name}`}
              width={40}
              height={42}
              priority
              unoptimized
              className="h-[42px] w-10 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <div className="text-body leading-tight font-bold text-ink">
                {business.name}
              </div>
              <div className="text-[11px] text-ink-muted">
                POS Management System
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <section key={section.label}>
                <div className="px-3 pb-1.5 text-label font-bold tracking-[.08em] text-ink-muted">
                  {section.label}
                </div>

                <div className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const active = isItemActive(item, pathname);
                    const itemClassName = cn(
                      "flex min-h-11 items-center gap-3 rounded-control px-3 py-2.5 text-amount transition-colors",
                      active
                        ? "bg-ink font-semibold text-white"
                        : "font-medium text-ink-soft hover:bg-canvas",
                    );
                    const content = (
                      <>
                        <Icon name={item.icon} size={20} strokeWidth={1.8} />
                        <span>{item.label}</span>
                      </>
                    );

                    return item.href ? (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={itemClassName}
                      >
                        {content}
                      </Link>
                    ) : (
                      <span
                        key={item.label}
                        title="Segera hadir"
                        className={cn(itemClassName, "cursor-default")}
                      >
                        {content}
                      </span>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </nav>

        <div className="border-t border-line px-3 py-3">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 font-sans text-amount font-medium text-ink-soft transition-colors hover:bg-canvas"
            >
              <Icon name="logout" size={20} strokeWidth={1.8} />
              <span>Keluar</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
