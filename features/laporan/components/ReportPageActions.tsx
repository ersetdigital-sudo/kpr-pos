"use client";

import { Button } from "@/components/ui/Button";
import { PeriodFilter } from "@/features/laporan/components/PeriodFilter";
import { usePermissions } from "@/features/session/data/session-repository";

export function ReportPageActions() {
  const { canExportReports } = usePermissions();

  return (
    <>
      <PeriodFilter />
      {canExportReports ? (
        <>
          <Button variant="outline" size="md">
            Export Excel
          </Button>
          <Button variant="outline" size="md">
            Export PDF
          </Button>
        </>
      ) : null}
    </>
  );
}
