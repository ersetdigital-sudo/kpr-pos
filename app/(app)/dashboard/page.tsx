import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { DashboardStats } from "@/features/dashboard/components/DashboardStats";
import { LowStockCard } from "@/features/dashboard/components/LowStockCard";
import { RecentTransactionsCard } from "@/features/dashboard/components/RecentTransactionsCard";
import { TopSalesCard } from "@/features/dashboard/components/TopSalesCard";
import { WeeklySalesCard } from "@/features/dashboard/components/WeeklySalesCard";
import { getDashboardData } from "@/features/dashboard/data/dashboard-data";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  const data = getDashboardData();

  return (
    <>
      <PageHeader
        title={data.header.title}
        subtitle={data.header.subtitle}
        user={data.user}
        actions={
          <>
            <Button variant="outline" size="md" className="gap-2">
              {data.header.branchLabel}
              <Icon name="chevronDown" size={14} strokeWidth={2} />
            </Button>
            <Chip tone="success" dot>
              Online · Tersinkron
            </Chip>
          </>
        }
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        <DashboardStats stats={data.stats} />

        <div className="flex flex-wrap gap-4">
          <WeeklySalesCard sales={data.weeklySales} />
          <TopSalesCard entries={data.topSales} />
        </div>

        <div className="flex flex-wrap gap-4">
          <RecentTransactionsCard transactions={data.recentTransactions} />
          <LowStockCard products={data.lowStock} />
        </div>
      </div>
    </>
  );
}
