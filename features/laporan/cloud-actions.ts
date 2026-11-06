"use server";

import { getReadSession } from "@/lib/auth/session";
import { readActivityLogs } from "@/features/activity/data/server-snapshot";
import {
  readSalesOrders,
  readTransactions,
} from "@/features/sales/data/server-snapshot";
import type { ActivityLog, SalesOrder, Transaction } from "@/lib/store/types";

export interface ReportSourceParams {
  /** ISO timestamp awal periode. */
  start: string;
  /** ISO timestamp akhir periode. */
  end: string;
  /** "all" atau id cabang. */
  branchId: string;
}

export interface ReportSource {
  transactions: Transaction[];
  salesOrders: SalesOrder[];
  activityLogs: ActivityLog[];
}

/**
 * Sumber data laporan diambil langsung untuk rentang tanggal yang dipilih,
 * jadi tidak bergantung pada snapshot sync harian.
 */
export async function fetchReportSourceAction(
  params: ReportSourceParams,
): Promise<ReportSource> {
  const session = await getReadSession();
  if (!session) throw new Error("Sesi pengguna tidak ditemukan");

  const branchId = params.branchId === "all" ? undefined : params.branchId;
  const range = { start: params.start, end: params.end, branchId };

  // Pesanan dihitung dari tanggal lunas (paidAt) yang bisa lebih baru dari
  // tanggal dibuat, jadi rentangnya dilebarkan ke belakang.
  const orderRange = {
    ...range,
    start: new Date(
      new Date(params.start).getTime() - 60 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };

  const [transactions, salesOrders, activityLogs] = await Promise.all([
    readTransactions(session, range),
    readSalesOrders(session, orderRange),
    readActivityLogs(session, { ...range, limit: 1000 }),
  ]);

  return { transactions, salesOrders, activityLogs };
}
