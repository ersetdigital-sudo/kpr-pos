import { ROLES, type Role } from "@/constants/roles";

/**
 * Satu sumber urutan baris matriks, kolom database, dan select Supabase.
 * Menambah izin baru cukup di sini.
 */
export const PERMISSION_FIELDS = [
  {
    key: "canViewDashboard",
    column: "can_view_dashboard",
    label: "Akses dashboard",
  },
  {
    key: "canAccessAttendance",
    column: "can_access_attendance",
    label: "Akses absensi",
  },
  {
    key: "canApplyDiscount",
    column: "can_apply_discount",
    label: "Diskon kasir",
  },
  {
    key: "canCancelTransaction",
    column: "can_cancel_transaction",
    label: "Refund / void",
  },
  {
    key: "canManageProducts",
    column: "can_manage_products",
    label: "Produk & stok",
  },
  {
    key: "canCreateSalesOrder",
    column: "can_create_sales_order",
    label: "Buat pesanan",
  },
  {
    key: "canManageSalesOrders",
    column: "can_manage_sales_orders",
    label: "Ubah status pesanan",
  },
  {
    key: "canDeleteSalesOrder",
    column: "can_delete_sales_order",
    label: "Hapus pesanan",
  },
  {
    key: "canExportReports",
    column: "can_export_reports",
    label: "Laporan & export",
  },
  {
    key: "canViewAllBranches",
    column: "can_view_all_branches",
    label: "Lihat semua cabang",
  },
  {
    key: "canViewAllAttendance",
    column: "can_view_all_attendance",
    label: "Absensi semua cabang",
  },
  {
    key: "canApproveLeave",
    column: "can_approve_leave",
    label: "Approve izin",
  },
  {
    key: "canManageEmployees",
    column: "can_manage_employees",
    label: "Kelola karyawan",
  },
  {
    key: "canManageBranches",
    column: "can_manage_branches",
    label: "Kelola cabang",
  },
  {
    key: "canManageSettings",
    column: "can_manage_settings",
    label: "Pengaturan",
  },
  {
    key: "canUseCashier",
    column: "can_use_cashier",
    label: "Akses kasir",
  },
  {
    key: "canViewProducts",
    column: "can_view_products",
    label: "Lihat produk & stok",
  },
] as const;

export type PermissionKey = (typeof PERMISSION_FIELDS)[number]["key"];

export type RolePermissions = Record<PermissionKey, boolean>;

export type RolePermissionsRow = Record<string, boolean>;

/** Baris matriks UI, urut sesuai PERMISSION_FIELDS. */
export const PERMISSION_ROWS: readonly { key: PermissionKey; label: string }[] =
  PERMISSION_FIELDS.map(({ key, label }) => ({ key, label }));

/** Kolom yang dibaca dari Supabase, termasuk kolom `role`. */
export const ROLE_PERMISSIONS_SELECT = [
  "role",
  ...PERMISSION_FIELDS.map(({ column }) => column),
].join(",");

export function mapRolePermissionsRow(
  row: RolePermissionsRow,
): RolePermissions {
  const permissions = {} as RolePermissions;

  PERMISSION_FIELDS.forEach(({ key, column }) => {
    permissions[key] = Boolean(row[column]);
  });

  return permissions;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  [ROLES.OWNER]: {
    canViewDashboard: true,
    canAccessAttendance: true,
    canApplyDiscount: true,
    canCancelTransaction: true,
    canManageProducts: true,
    canCreateSalesOrder: true,
    canManageSalesOrders: true,
    canDeleteSalesOrder: true,
    canExportReports: true,
    canViewAllBranches: true,
    canViewAllAttendance: true,
    canApproveLeave: true,
    canManageEmployees: true,
    canManageBranches: true,
    canManageSettings: true,
    canUseCashier: true,
    canViewProducts: true,
  },
  [ROLES.MANAGER]: {
    canViewDashboard: true,
    canAccessAttendance: true,
    canApplyDiscount: true,
    canCancelTransaction: true,
    canManageProducts: true,
    canCreateSalesOrder: true,
    canManageSalesOrders: true,
    canDeleteSalesOrder: true,
    canExportReports: true,
    canViewAllBranches: true,
    canViewAllAttendance: true,
    canApproveLeave: true,
    canManageEmployees: true,
    canManageBranches: false,
    canManageSettings: false,
    canUseCashier: true,
    canViewProducts: true,
  },
  [ROLES.SUPERVISOR]: {
    canViewDashboard: true,
    canAccessAttendance: true,
    canApplyDiscount: true,
    canCancelTransaction: true,
    canManageProducts: false,
    canCreateSalesOrder: true,
    canManageSalesOrders: true,
    canDeleteSalesOrder: true,
    canExportReports: false,
    canViewAllBranches: true,
    canViewAllAttendance: true,
    canApproveLeave: false,
    canManageEmployees: false,
    canManageBranches: false,
    canManageSettings: false,
    canUseCashier: true,
    canViewProducts: true,
  },
  [ROLES.CASHIER]: {
    canViewDashboard: true,
    canAccessAttendance: true,
    canApplyDiscount: true,
    canCancelTransaction: false,
    canManageProducts: false,
    canCreateSalesOrder: false,
    canManageSalesOrders: false,
    canDeleteSalesOrder: false,
    canExportReports: false,
    canViewAllBranches: false,
    canViewAllAttendance: false,
    canApproveLeave: false,
    canManageEmployees: false,
    canManageBranches: false,
    canManageSettings: false,
    canUseCashier: true,
    canViewProducts: false,
  },
  [ROLES.INVENTORY]: {
    canViewDashboard: true,
    canAccessAttendance: true,
    canApplyDiscount: true,
    canCancelTransaction: false,
    canManageProducts: true,
    canCreateSalesOrder: false,
    canManageSalesOrders: false,
    canDeleteSalesOrder: false,
    canExportReports: false,
    canViewAllBranches: true,
    canViewAllAttendance: false,
    canApproveLeave: false,
    canManageEmployees: false,
    canManageBranches: false,
    canManageSettings: false,
    canUseCashier: false,
    canViewProducts: true,
  },
  [ROLES.ACCOUNTANT]: {
    canViewDashboard: true,
    canAccessAttendance: true,
    canApplyDiscount: true,
    canCancelTransaction: false,
    canManageProducts: false,
    canCreateSalesOrder: false,
    canManageSalesOrders: false,
    canDeleteSalesOrder: false,
    canExportReports: true,
    canViewAllBranches: true,
    canViewAllAttendance: false,
    canApproveLeave: false,
    canManageEmployees: false,
    canManageBranches: false,
    canManageSettings: false,
    canUseCashier: false,
    canViewProducts: false,
  },
  [ROLES.SALES]: {
    canViewDashboard: true,
    canAccessAttendance: true,
    canApplyDiscount: true,
    canCancelTransaction: false,
    canManageProducts: false,
    canCreateSalesOrder: true,
    canManageSalesOrders: false,
    canDeleteSalesOrder: false,
    canExportReports: false,
    canViewAllBranches: false,
    canViewAllAttendance: false,
    canApproveLeave: false,
    canManageEmployees: false,
    canManageBranches: false,
    canManageSettings: false,
    canUseCashier: false,
    canViewProducts: false,
  },
  [ROLES.STAFF]: {
    canViewDashboard: true,
    canAccessAttendance: true,
    canApplyDiscount: true,
    canCancelTransaction: false,
    canManageProducts: false,
    canCreateSalesOrder: false,
    canManageSalesOrders: false,
    canDeleteSalesOrder: false,
    canExportReports: false,
    canViewAllBranches: false,
    canViewAllAttendance: false,
    canApproveLeave: false,
    canManageEmployees: false,
    canManageBranches: false,
    canManageSettings: false,
    canUseCashier: false,
    canViewProducts: false,
  },
};
