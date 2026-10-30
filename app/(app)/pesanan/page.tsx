import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { LeaderboardTable } from "@/features/pesanan/components/LeaderboardTable";
import { NewOrderForm } from "@/features/pesanan/components/NewOrderForm";
import { OrderTable } from "@/features/pesanan/components/OrderTable";
import { SalesStatsCards } from "@/features/pesanan/components/SalesStatsCards";
import { getSalesOrdersData } from "@/features/pesanan/data/pesanan-data";

export const metadata: Metadata = {
  title: "Pesanan Sales",
};

export default function PesananPage() {
  const data = getSalesOrdersData();

  return (
    <>
      <PageHeader
        title={data.header.title}
        subtitle={data.header.subtitle}
        user={data.user}
        actions={
          <Chip tone="warning" dot>
            Offline · 2 data menunggu sinkron
          </Chip>
        }
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        <SalesStatsCards stats={data.stats} />

        <div className="flex flex-wrap items-start gap-4">
          <NewOrderForm
            productOptions={data.productOptions}
            draft={data.draft}
          />

          <div className="flex min-w-0 flex-[2_1_480px] flex-col gap-4">
            <OrderTable orders={data.orders} />
            <LeaderboardTable entries={data.leaderboard} />
          </div>
        </div>
      </div>
    </>
  );
}
