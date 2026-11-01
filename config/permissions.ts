import { ROLES, type Role } from "@/constants/roles";

export interface RolePermissions {
  canApplyDiscount: boolean;
  canCancelTransaction: boolean;
  canManageProducts: boolean;
  canCreateSalesOrder: boolean;
  canManageSalesOrders: boolean;
  canDeleteSalesOrder: boolean;
  canExportReports: boolean;
  canViewAllBranches: boolean;
  /** Melihat absensi seluruh karyawan, bukan hanya miliknya. */
  canViewAllAttendance: boolean;
  canApproveLeave: boolean;
  canManageEmployees: boolean;
  canManageBranches: boolean;
  canManageSettings: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  [ROLES.OWNER]: {
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
  },
  [ROLES.MANAGER]: {
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
  },
  [ROLES.SUPERVISOR]: {
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
  },
  [ROLES.CASHIER]: {
    canApplyDiscount: false,
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
  },
  [ROLES.INVENTORY]: {
    canApplyDiscount: false,
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
  },
  [ROLES.ACCOUNTANT]: {
    canApplyDiscount: false,
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
  },
  [ROLES.SALES]: {
    canApplyDiscount: false,
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
  },
  [ROLES.STAFF]: {
    canApplyDiscount: false,
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
  },
};
