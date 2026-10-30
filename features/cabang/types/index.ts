export interface BranchRow {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  employeeCount: number;
  productsInStock: number;
  monthlyRevenue: number;
}

export interface BranchFilters {
  status: "all" | "active" | "inactive";
}

export interface BranchFormInput {
  name: string;
  address: string;
  phone: string;
}

export interface BranchSummary {
  totalBranches: number;
  activeBranches: number;
  totalEmployees: number;
  monthlyRevenue: number;
}
