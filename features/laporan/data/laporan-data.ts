import { ALL_ROLES, ROLES } from "@/constants/roles";
import type { ReportsData } from "@/features/laporan/types";

const paymentBreakdown: ReportsData["paymentBreakdown"] = [
  { method: "Cash", amount: 54_600_000, percent: 46 },
  { method: "QRIS", amount: 42_700_000, percent: 36 },
  { method: "Transfer", amount: 21_300_000, percent: 18 },
];

const cashiers: ReportsData["cashiers"] = [
  { name: "Lala", transactionCount: 1_128, revenue: 63_100_000 },
  { name: "Fajar", transactionCount: 976, revenue: 55_500_000 },
];

const bestSellers: ReportsData["bestSellers"] = [
  { rank: 1, name: "[Produk A]", soldCount: 412 },
  { rank: 2, name: "[Produk E]", soldCount: 356 },
  { rank: 3, name: "[Produk D]", soldCount: 288 },
  { rank: 4, name: "[Produk H]", soldCount: 201 },
];

const activityLog: ReportsData["activityLog"] = [
  {
    id: "log-01",
    loggedAt: "2026-10-29T13:12:00",
    userName: "Lala",
    role: ROLES.CASHIER,
    action: "Membuat",
    detail: "Transaksi INV-2910-086 · Rp 185.000",
  },
  {
    id: "log-02",
    loggedAt: "2026-10-29T12:51:00",
    userName: "Bayu",
    role: ROLES.INVENTORY,
    action: "Mengubah",
    detail: "Stok [Produk B] 8 → 3 (koreksi opname)",
  },
  {
    id: "log-03",
    loggedAt: "2026-10-29T11:40:00",
    userName: "Rina",
    role: ROLES.SALES,
    action: "Membuat",
    detail: "Pesanan SO-2910-013 · Toko Makmur",
  },
  {
    id: "log-04",
    loggedAt: "2026-10-29T10:05:00",
    userName: "Hendra",
    role: ROLES.MANAGER,
    action: "Mengubah",
    detail: "Harga jual [Produk D] Rp 60.000 → Rp 62.000",
  },
  {
    id: "log-05",
    loggedAt: "2026-10-29T09:30:00",
    userName: "Fajar",
    role: ROLES.CASHIER,
    action: "Membatalkan",
    detail: "Transaksi INV-2910-012 · alasan: salah input",
  },
  {
    id: "log-06",
    loggedAt: "2026-10-29T08:02:00",
    userName: "Dewi",
    role: ROLES.ACCOUNTANT,
    action: "Membuka",
    detail: "Laporan bulanan Oktober",
  },
];

/** Sumber data laporan; ganti isi fungsi ini saat memakai API/database. */
export function getReportsData(): ReportsData {
  return {
    header: {
      title: "Laporan",
      subtitle: "1 – 29 Oktober 2026 · Toko Utama",
    },
    stats: {
      revenue: 118_600_000,
      grossProfit: 36_200_000,
      marginPercent: 30.5,
      transactionCount: 2_104,
      averageTransaction: 56_400,
      totalSalesBonus: 2_100_000,
      activeSalespeople: 4,
    },
    paymentBreakdown,
    cashiers,
    cashDifference: 0,
    bestSellers,
    activityLog,
    roles: ALL_ROLES,
  };
}
