import type { IconName } from "@/components/ui/Icon";
import { ALL_ROLES, ROLES, type Role } from "@/constants/roles";

export interface NavItem {
  label: string;
  /** Kosongkan href untuk menu yang halamannya belum tersedia. */
  href?: string;
  icon: IconName;
  roles: readonly Role[];
}

export interface NavSection {
  label: string;
  items: readonly NavItem[];
}

export function findNavItemByPath(pathname: string): NavItem | undefined {
  return NAV_SECTIONS.flatMap((section) => section.items).find(
    (item) =>
      item.href &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
}

export function canAccessPath(pathname: string, role: Role): boolean {
  const item = findNavItemByPath(pathname);
  return item ? item.roles.includes(role) : true;
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    label: "OPERASIONAL",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: "dashboard",
        roles: ALL_ROLES,
      },
      {
        label: "Kasir",
        href: "/kasir",
        icon: "receipt",
        roles: [ROLES.OWNER, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.CASHIER],
      },
      {
        label: "Pesanan Sales",
        href: "/pesanan",
        icon: "clipboard",
        roles: [ROLES.OWNER, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.SALES],
      },
      {
        label: "Produk & Stok",
        href: "/produk",
        icon: "package",
        roles: [
          ROLES.OWNER,
          ROLES.MANAGER,
          ROLES.SUPERVISOR,
          ROLES.INVENTORY,
        ],
      },
      {
        label: "Absensi",
        icon: "clock",
        roles: ALL_ROLES,
      },
      {
        label: "Laporan",
        href: "/laporan",
        icon: "chart",
        roles: [ROLES.OWNER, ROLES.MANAGER, ROLES.ACCOUNTANT],
      },
    ],
  },
  {
    label: "MANAJEMEN",
    items: [
      {
        label: "Karyawan & Role",
        icon: "users",
        roles: [ROLES.OWNER, ROLES.MANAGER],
      },
      {
        label: "Cabang",
        icon: "store",
        roles: [ROLES.OWNER],
      },
      {
        label: "Pengaturan",
        icon: "settings",
        roles: [ROLES.OWNER],
      },
    ],
  },
];
