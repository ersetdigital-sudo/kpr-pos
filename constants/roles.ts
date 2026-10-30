export const ROLES = {
  OWNER: "Owner",
  MANAGER: "Manager",
  SUPERVISOR: "Supervisor",
  CASHIER: "Cashier",
  INVENTORY: "Inventory",
  ACCOUNTANT: "Accountant",
  SALES: "Sales",
  STAFF: "Staff",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES = [
  ROLES.OWNER,
  ROLES.MANAGER,
  ROLES.SUPERVISOR,
  ROLES.CASHIER,
  ROLES.INVENTORY,
  ROLES.ACCOUNTANT,
  ROLES.SALES,
  ROLES.STAFF,
] as const satisfies readonly Role[];
