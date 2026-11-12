import type { IconName } from "@/components/ui/Icon";
import type { RolePermissions } from "@/config/permissions";

export interface NavItem {
  label: string;
  /** Kosongkan href untuk menu yang halamannya belum tersedia. */
  href?: string;
  icon: IconName;
  canAccess: (permissions: RolePermissions) => boolean;
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

export function canAccessPath(
  pathname: string,
  permissions: RolePermissions,
): boolean {
  const item = findNavItemByPath(pathname);
  return item ? item.canAccess(permissions) : true;
}

/** Halaman pertama yang boleh dibuka role ini, urut sesuai NAV_SECTIONS. */
export function getFirstAccessiblePath(
  permissions: RolePermissions,
): string | null {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.href && item.canAccess(permissions)) return item.href;
    }
  }

  return null;
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    label: "UTAMA",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: "dashboard",
        canAccess: (permissions) => permissions.canViewDashboard,
      },
    ],
  },
  {
    label: "OPERASIONAL",
    items: [
      {
        label: "Kasir",
        href: "/kasir",
        icon: "receipt",
        canAccess: (permissions) => permissions.canUseCashier,
      },
      {
        label: "Pesanan Sales",
        href: "/pesanan",
        icon: "clipboard",
        canAccess: (permissions) =>
          permissions.canCreateSalesOrder ||
          permissions.canManageSalesOrders,
      },
      {
        label: "Produk & Stok",
        href: "/produk",
        icon: "package",
        canAccess: (permissions) =>
          permissions.canViewProducts || permissions.canManageProducts,
      },
      {
        label: "Absensi",
        href: "/absensi",
        icon: "clock",
        canAccess: (permissions) => permissions.canAccessAttendance,
      },
      {
        label: "Laporan",
        href: "/laporan",
        icon: "chart",
        canAccess: (permissions) => permissions.canExportReports,
      },
      {
        label: "Buku Kas",
        href: "/buku-kas",
        icon: "wallet",
        canAccess: (permissions) => permissions.canAccessCashBook,
      },
    ],
  },
  {
    label: "MANAJEMEN",
    items: [
      {
        label: "Karyawan & Role",
        href: "/karyawan",
        icon: "users",
        canAccess: (permissions) => permissions.canManageEmployees,
      },
      {
        label: "Cabang",
        href: "/cabang",
        icon: "store",
        canAccess: (permissions) => permissions.canManageBranches,
      },
      {
        label: "Pengaturan",
        href: "/pengaturan",
        icon: "settings",
        canAccess: (permissions) => permissions.canManageSettings,
      },
    ],
  },
];
