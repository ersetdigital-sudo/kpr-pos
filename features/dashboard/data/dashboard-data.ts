import { formatDateLong } from "@/lib/format";
import type { DashboardData } from "@/features/dashboard/types";

const weeklySales: DashboardData["weeklySales"] = [
  { day: "Jum", total: 3_900_000, barHeight: 128, isCurrentDay: false },
  { day: "Sab", total: 3_400_000, barHeight: 112, isCurrentDay: false },
  { day: "Min", total: 4_600_000, barHeight: 152, isCurrentDay: false },
  { day: "Sen", total: 3_100_000, barHeight: 102, isCurrentDay: false },
  { day: "Sel", total: 4_200_000, barHeight: 138, isCurrentDay: false },
  { day: "Rab", total: 5_300_000, barHeight: 176, isCurrentDay: false },
  { day: "Kam", total: 4_900_000, barHeight: 160, isCurrentDay: true },
];

const topSales: DashboardData["topSales"] = [
  { rank: 1, name: "Rina", soldCount: 142, bonus: 710_000, progress: 100 },
  { rank: 2, name: "Dimas", soldCount: 118, bonus: 590_000, progress: 83 },
  { rank: 3, name: "Sinta", soldCount: 97, bonus: 485_000, progress: 68 },
  { rank: 4, name: "Agus", soldCount: 64, bonus: 320_000, progress: 45 },
];

const recentTransactions: DashboardData["recentTransactions"] = [
  {
    invoiceNumber: "INV-2910-086",
    time: "13:12",
    cashier: "Lala",
    method: "QRIS",
    total: 185_000,
  },
  {
    invoiceNumber: "INV-2910-085",
    time: "13:05",
    cashier: "Lala",
    method: "Cash",
    total: 72_500,
  },
  {
    invoiceNumber: "INV-2910-084",
    time: "12:48",
    cashier: "Fajar",
    method: "Transfer",
    total: 640_000,
  },
  {
    invoiceNumber: "INV-2910-083",
    time: "12:30",
    cashier: "Fajar",
    method: "QRIS",
    total: 98_000,
  },
];

const lowStock: DashboardData["lowStock"] = [
  { id: "produk-a", name: "[Produk A]", branch: "Toko Utama", remaining: 3 },
  { id: "produk-b", name: "[Produk B]", branch: "Toko Utama", remaining: 5 },
  { id: "produk-c", name: "[Produk C]", branch: "Toko Utama", remaining: 0 },
  { id: "produk-d", name: "[Produk D]", branch: "Toko Utama", remaining: 6 },
];

/** Sumber data dashboard; ganti isi fungsi ini saat memakai API/database. */
export function getDashboardData(): DashboardData {
  return {
    header: {
      title: "Dashboard",
      subtitle: `${formatDateLong("2026-10-29")} · Ringkasan seluruh cabang`,
    },
    stats: {
      salesToday: 4_850_000,
      growthPercent: 12,
      transactionCount: 86,
      paymentCounts: { cash: 41, qris: 32, transfer: 13 },
      lowStockCount: 7,
      employeesPresent: 9,
      employeesTotal: 11,
      employeesOnLeave: 2,
    },
    weeklySales,
    topSales,
    recentTransactions,
    lowStock,
  };
}
