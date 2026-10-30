import { ROLES, type Role } from "@/constants/roles";

export interface RolePermissions {
  canApplyDiscount: boolean;
  canCancelTransaction: boolean;
  canManageProducts: boolean;
  canCreateSalesOrder: boolean;
  canManageSalesOrders: boolean;
  canExportReports: boolean;
  canViewAllBranches: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  [ROLES.OWNER]: {
    canApplyDiscount: true,
    canCancelTransaction: true,
    canManageProducts: true,
    canCreateSalesOrder: true,
    canManageSalesOrders: true,
    canExportReports: true,
    canViewAllBranches: true,
  },
  [ROLES.MANAGER]: {
    canApplyDiscount: true,
    canCancelTransaction: true,
    canManageProducts: true,
    canCreateSalesOrder: true,
    canManageSalesOrders: true,
    canExportReports: true,
    canViewAllBranches: true,
  },
  [ROLES.SUPERVISOR]: {
    canApplyDiscount: true,
    canCancelTransaction: true,
    canManageProducts: false,
    canCreateSalesOrder: true,
    canManageSalesOrders: true,
    canExportReports: false,
    canViewAllBranches: true,
  },
  [ROLES.CASHIER]: {
    canApplyDiscount: false,
    canCancelTransaction: false,
    canManageProducts: false,
    canCreateSalesOrder: false,
    canManageSalesOrders: false,
    canExportReports: false,
    canViewAllBranches: false,
  },
  [ROLES.INVENTORY]: {
    canApplyDiscount: false,
    canCancelTransaction: false,
    canManageProducts: true,
    canCreateSalesOrder: false,
    canManageSalesOrders: false,
    canExportReports: false,
    canViewAllBranches: true,
  },
  [ROLES.ACCOUNTANT]: {
    canApplyDiscount: false,
    canCancelTransaction: false,
    canManageProducts: false,
    canCreateSalesOrder: false,
    canManageSalesOrders: false,
    canExportReports: true,
    canViewAllBranches: true,
  },
  [ROLES.SALES]: {
    canApplyDiscount: false,
    canCancelTransaction: false,
    canManageProducts: false,
    canCreateSalesOrder: true,
    canManageSalesOrders: false,
    canExportReports: false,
    canViewAllBranches: false,
  },
  [ROLES.STAFF]: {
    canApplyDiscount: false,
    canCancelTransaction: false,
    canManageProducts: false,
    canCreateSalesOrder: false,
    canManageSalesOrders: false,
    canExportReports: false,
    canViewAllBranches: false,
  },
};
