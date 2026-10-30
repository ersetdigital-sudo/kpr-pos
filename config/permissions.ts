import { ROLES, type Role } from "@/constants/roles";

export interface RolePermissions {
  canApplyDiscount: boolean;
  canCancelTransaction: boolean;
  canManageProducts: boolean;
  canCreateSalesOrder: boolean;
  canExportReports: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  [ROLES.OWNER]: {
    canApplyDiscount: true,
    canCancelTransaction: true,
    canManageProducts: true,
    canCreateSalesOrder: true,
    canExportReports: true,
  },
  [ROLES.MANAGER]: {
    canApplyDiscount: true,
    canCancelTransaction: true,
    canManageProducts: true,
    canCreateSalesOrder: true,
    canExportReports: true,
  },
  [ROLES.SUPERVISOR]: {
    canApplyDiscount: true,
    canCancelTransaction: true,
    canManageProducts: false,
    canCreateSalesOrder: true,
    canExportReports: false,
  },
  [ROLES.CASHIER]: {
    canApplyDiscount: false,
    canCancelTransaction: false,
    canManageProducts: false,
    canCreateSalesOrder: false,
    canExportReports: false,
  },
  [ROLES.INVENTORY]: {
    canApplyDiscount: false,
    canCancelTransaction: false,
    canManageProducts: true,
    canCreateSalesOrder: false,
    canExportReports: false,
  },
  [ROLES.ACCOUNTANT]: {
    canApplyDiscount: false,
    canCancelTransaction: false,
    canManageProducts: false,
    canCreateSalesOrder: false,
    canExportReports: true,
  },
  [ROLES.SALES]: {
    canApplyDiscount: false,
    canCancelTransaction: false,
    canManageProducts: false,
    canCreateSalesOrder: true,
    canExportReports: false,
  },
  [ROLES.STAFF]: {
    canApplyDiscount: false,
    canCancelTransaction: false,
    canManageProducts: false,
    canCreateSalesOrder: false,
    canExportReports: false,
  },
};
