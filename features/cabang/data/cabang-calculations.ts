import { isWithinRange, getMonthRange } from "@/lib/date-range";
import type { AppDatabase } from "@/lib/store/types";
import type {
  BranchFilters,
  BranchRow,
  BranchSummary,
} from "@/features/cabang/types";

export function buildBranchRows(
  database: AppDatabase,
  filters: BranchFilters,
  today: Date,
): BranchRow[] {
  const monthRange = getMonthRange(today);

  return database.branches
    .filter((branch) => {
      if (filters.status === "active") return branch.isActive;
      if (filters.status === "inactive") return !branch.isActive;
      return true;
    })
    .map((branch) => {
      const employeeCount = database.employees.filter(
        (employee) => employee.branchId === branch.id && employee.isActive,
      ).length;
      const productsInStock = database.stocks.filter(
        (stock) => stock.branchId === branch.id && stock.quantity > 0,
      ).length;
      const monthlyRevenue = database.transactions
        .filter(
          (transaction) =>
            transaction.branchId === branch.id &&
            isWithinRange(transaction.createdAt, monthRange),
        )
        .reduce((total, transaction) => total + transaction.total, 0);

      return {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        isActive: branch.isActive,
        employeeCount,
        productsInStock,
        monthlyRevenue,
      };
    })
    .sort((first, second) => {
      if (first.isActive !== second.isActive) return first.isActive ? -1 : 1;
      return first.name.localeCompare(second.name);
    });
}

export function calculateBranchSummary(
  database: AppDatabase,
  today: Date,
): BranchSummary {
  const monthRange = getMonthRange(today);

  return {
    totalBranches: database.branches.length,
    activeBranches: database.branches.filter((branch) => branch.isActive).length,
    totalEmployees: database.employees.filter((employee) => employee.isActive)
      .length,
    monthlyRevenue: database.transactions
      .filter((transaction) =>
        isWithinRange(transaction.createdAt, monthRange),
      )
      .reduce((total, transaction) => total + transaction.total, 0),
  };
}
