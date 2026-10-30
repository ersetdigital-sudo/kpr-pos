import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActivityLogTable } from "@/features/laporan/components/ActivityLogTable";
import { BestSellersCard } from "@/features/laporan/components/BestSellersCard";
import { CashierReportCard } from "@/features/laporan/components/CashierReportCard";
import { PaymentMethodCard } from "@/features/laporan/components/PaymentMethodCard";
import { ReportPageActions } from "@/features/laporan/components/ReportPageActions";
import { ReportStatsCards } from "@/features/laporan/components/ReportStatsCards";
import { getReportsData } from "@/features/laporan/data/laporan-data";

export const metadata: Metadata = {
  title: "Laporan",
};

export default function LaporanPage() {
  const data = getReportsData();

  return (
    <>
      <PageHeader
        title={data.header.title}
        subtitle={data.header.subtitle}
        actions={<ReportPageActions />}
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        <ReportStatsCards stats={data.stats} />

        <div className="flex flex-wrap gap-4">
          <PaymentMethodCard breakdown={data.paymentBreakdown} />
          <CashierReportCard
            cashiers={data.cashiers}
            cashDifference={data.cashDifference}
          />
          <BestSellersCard bestSellers={data.bestSellers} />
        </div>

        <ActivityLogTable logs={data.activityLog} roles={data.roles} />
      </div>
    </>
  );
}
