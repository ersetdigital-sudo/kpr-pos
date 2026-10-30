"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { Icon } from "@/components/ui/Icon";
import { NAV_SECTIONS, type NavItem } from "@/config/navigation";
import { useSession } from "@/features/session/data/session-repository";
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
          "fixed inset-y-0 left-0 z-50 w-[260px] bg-sidebar transition-transform duration-200 lg:static lg:z-auto lg:shrink-0 lg:translate-x-0 lg:transition-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup menu navigasi"
          className="absolute top-2.5 right-2.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-control border-0 bg-transparent text-sidebar-muted lg:hidden"
        >
          <Icon name="close" size={18} strokeWidth={2} />
        </button>

        <nav className="flex h-full flex-col gap-1 overflow-y-auto bg-sidebar px-[14px] py-5">
          <div className="mb-2 flex flex-col items-center gap-3 border-b border-sidebar-line px-2.5 pt-2 pb-5 text-center">
            <Image
              src="/logo-kpr.png"
              alt="Logo CV. Karya Putra Ragil"
              width={80}
              height={84}
              priority
              className="h-[84px] w-20 object-contain"
            />
            <div>
              <div className="text-[15px] leading-[1.3] font-bold text-white">
                CV. Karya Putra Ragil
              </div>
              <div className="text-meta text-sidebar-muted">
                POS Management System
              </div>
            </div>
          </div>

          {sections.map((section, sectionIndex) => (
            <Fragment key={section.label}>
              <div
                className={cn(
                  "px-3 pb-1 text-overline font-bold tracking-[.08em] text-sidebar-muted",
                  sectionIndex === 0 ? "pt-2" : "pt-4",
                )}
              >
                {section.label}
              </div>

              {section.items.map((item) => {
                const active = isItemActive(item, pathname);
                const itemClassName = cn(
                  "flex min-h-11 items-center gap-2.5 rounded-control px-3 py-2.5 text-body",
                  active
                    ? "bg-brand font-semibold text-white"
                    : "text-sidebar-text",
                );
                const content = (
                  <>
                    <Icon name={item.icon} />
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
            </Fragment>
          ))}
        </nav>
      </aside>
    </>
  );
}
