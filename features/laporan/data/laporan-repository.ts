"use client";

import { useEffect, useState } from "react";
import type { DateRangeValue } from "@/components/ui/DateRangePicker";
import { resolveDateRange } from "@/lib/date-range";
import { useHydratedDatabase } from "@/lib/store/store";
import type { AppDatabase } from "@/lib/store/types";
import {
  fetchReportSourceAction,
  type ReportSource,
} from "@/features/laporan/cloud-actions";

/**
 * Data laporan; null sampai store ter-hydrate agar rentang tanggal aman.
 * Transaksi, pesanan, dan log untuk periode terpilih diambil dari server.
 */
export function useLaporanData(
  range: DateRangeValue,
  branchScope: string | "all",
): AppDatabase | null {
  const database = useHydratedDatabase();
  const [source, setSource] = useState<ReportSource | null>(null);
  const ready = database !== null;
  const { preset, start, end } = range;

  useEffect(() => {
    if (!ready) return;

    const resolved = resolveDateRange({ preset, start, end }, new Date());
    let active = true;

    void fetchReportSourceAction({
      start: resolved.start.toISOString(),
      end: resolved.end.toISOString(),
      branchId: branchScope,
    })
      .then((result) => {
        if (active) setSource(result);
      })
      .catch((error) => {
        console.error("Gagal memuat data laporan:", error);
      });

    return () => {
      active = false;
    };
  }, [ready, preset, start, end, branchScope]);

  if (!database) return null;
  if (!source) return database;

  return {
    ...database,
    transactions: source.transactions,
    salesOrders: source.salesOrders,
    activityLogs: source.activityLogs,
  };
}
