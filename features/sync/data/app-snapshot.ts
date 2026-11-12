import "server-only";

import { readActivityLogs } from "@/features/activity/data/server-snapshot";
import { readAttendanceSnapshot } from "@/features/absensi/data/server-snapshot";
import { readKasbonSnapshot } from "@/features/kasbon/data/server-snapshot";
import { readEmployees } from "@/features/karyawan/data/server-snapshot";
import { readCustomers } from "@/features/pelanggan/data/server-snapshot";
import { readSettingsBranchSnapshot } from "@/features/pengaturan/data/server-snapshot";
import { readProductStockSnapshot } from "@/features/produk/data/server-snapshot";
import { readSalesSnapshot } from "@/features/sales/data/server-snapshot";
import type { SessionState } from "@/features/session/types";
import type { AppSnapshot } from "@/features/sync/types";

/**
 * Membaca seluruh snapshot dalam satu batch paralel. Setiap pembaca hanya
 * dijalankan bila role user memang membutuhkan datanya, sehingga payload dan
 * jumlah query tetap kecil.
 */
export async function readAppSnapshot(
  session: SessionState,
): Promise<AppSnapshot> {
  // Master produk dipakai dashboard/kasir/pesanan untuk semua role; riwayat
  // stok hanya diambil untuk role yang boleh membuka halaman produk.
  const [
    settingsBranch,
    employees,
    productStock,
    sales,
    customers,
    attendance,
    kasbon,
    logs,
  ] = await Promise.all([
    readSettingsBranchSnapshot(),
    readEmployees(),
    readProductStockSnapshot(session),
    readSalesSnapshot(session),
    readCustomers(),
    readAttendanceSnapshot(session),
    readKasbonSnapshot(session),
    readActivityLogs(session, { limit: 200 }),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    session: {
      currentEmployeeId: session.employee.id,
      activeBranchId: session.branch.id,
    },
    settings: settingsBranch.settings,
    branches: settingsBranch.branches,
    employees,
    categories: productStock?.categories ?? [],
    products: productStock?.products ?? [],
    stocks: productStock?.stocks ?? [],
    stockIns: productStock?.stockIns ?? [],
    stockOpnames: productStock?.stockOpnames ?? [],
    stockTransfers: productStock?.stockTransfers ?? [],
    transactions: sales.transactions,
    salesOrders: sales.salesOrders,
    drafts: sales.drafts,
    customers,
    attendance: attendance.attendance,
    leaveRequests: attendance.leaveRequests,
    kasbon,
    activityLogs: logs,
  };
}
