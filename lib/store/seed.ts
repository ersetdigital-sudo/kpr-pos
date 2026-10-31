import { ROLES } from "@/constants/roles";
import type {
  ActivityLog,
  AppDatabase,
  AttendanceRecord,
  AttendanceSettings,
  Branch,
  Employee,
  LeaveRequest,
  Product,
  SalesBonusSettings,
  SalesOrder,
  SalesOrderItem,
  StockInRecord,
  StockOpnameRecord,
  StockTransferRecord,
  Transaction,
  TransactionItem,
} from "@/lib/store/types";

export const DEFAULT_ATTENDANCE: AttendanceSettings = {
  workStartTime: "08:00",
  workEndTime: "17:00",
};

export const DEFAULT_SALES_BONUS: SalesBonusSettings = {
  type: "per_piece",
  perPieceAmount: 5_000,
  percentRate: 2.5,
  tiers: [
    { minQuantity: 200, amountPerPiece: 7_500 },
    { minQuantity: 100, amountPerPiece: 6_000 },
    { minQuantity: 0, amountPerPiece: 5_000 },
  ],
};

function sumItems(items: readonly { unitPrice: number; quantity: number }[]) {
  return items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
}

export function createSeedDatabase(): AppDatabase {
  const branches: Branch[] = [
    {
      id: "br-main",
      name: "Toko Utama",
      address: "Jl. Malioboro No. 88, Yogyakarta",
      phone: "0274-512345",
      isActive: true,
    },
    {
      id: "br-bandung",
      name: "Cabang Bandung",
      address: "Jl. Asia Afrika No. 21, Bandung",
      phone: "022-4234567",
      isActive: true,
    },
  ];

  const employees: Employee[] = [
    {
      id: "emp-owner",
      name: "Nurcahyo",
      phone: "0812-1000-0001",
      initials: "NA",
      role: ROLES.OWNER,
      branchId: "br-main",
      isActive: true,
    },
    {
      id: "emp-manager",
      name: "Hendra",
      phone: "0812-1000-0002",
      initials: "HD",
      role: ROLES.MANAGER,
      branchId: "br-main",
      isActive: true,
    },
    {
      id: "emp-supervisor",
      name: "Sinta",
      phone: "0812-1000-0003",
      initials: "SN",
      role: ROLES.SUPERVISOR,
      branchId: "br-bandung",
      isActive: true,
    },
    {
      id: "emp-cashier-lala",
      name: "Lala",
      phone: "0812-1000-0004",
      initials: "LA",
      role: ROLES.CASHIER,
      branchId: "br-main",
      isActive: true,
    },
    {
      id: "emp-cashier-fajar",
      name: "Fajar",
      phone: "0812-1000-0005",
      initials: "FA",
      role: ROLES.CASHIER,
      branchId: "br-bandung",
      isActive: true,
    },
    {
      id: "emp-inventory-bayu",
      name: "Bayu",
      phone: "0812-1000-0006",
      initials: "BY",
      role: ROLES.INVENTORY,
      branchId: "br-main",
      isActive: true,
    },
    {
      id: "emp-accountant-dewi",
      name: "Dewi",
      phone: "0812-1000-0007",
      initials: "DW",
      role: ROLES.ACCOUNTANT,
      branchId: "br-main",
      isActive: true,
    },
    {
      id: "emp-sales-rina",
      name: "Rina",
      phone: "0812-1000-0008",
      initials: "RI",
      role: ROLES.SALES,
      branchId: "br-main",
      isActive: true,
    },
    {
      id: "emp-sales-dimas",
      name: "Dimas",
      phone: "0812-1000-0009",
      initials: "DI",
      role: ROLES.SALES,
      branchId: "br-bandung",
      isActive: true,
    },
    {
      id: "emp-staff-agus",
      name: "Agus",
      phone: "0812-1000-0010",
      initials: "AG",
      role: ROLES.STAFF,
      branchId: "br-main",
      isActive: true,
    },
  ];

  const categories = [
    { id: "cat-1", name: "[Kategori 1]", isActive: true },
    { id: "cat-2", name: "[Kategori 2]", isActive: true },
    { id: "cat-3", name: "[Kategori 3]", isActive: true },
    { id: "cat-4", name: "[Kategori 4]", isActive: true },
  ];

  const products: Product[] = [
    {
      id: "prod-a",
      name: "[Produk A]",
      sku: "SKU-0001",
      categoryId: "cat-1",
      costPrice: 24_000,
      price: 35_000,
      isActive: true,
    },
    {
      id: "prod-b",
      name: "[Produk B]",
      sku: "SKU-0002",
      categoryId: "cat-1",
      costPrice: 33_000,
      price: 48_000,
      isActive: true,
    },
    {
      id: "prod-c",
      name: "[Produk C]",
      sku: "SKU-0003",
      categoryId: "cat-2",
      costPrice: 16_000,
      price: 25_000,
      isActive: true,
    },
    {
      id: "prod-d",
      name: "[Produk D]",
      sku: "SKU-0004",
      categoryId: "cat-2",
      costPrice: 45_000,
      price: 62_000,
      isActive: true,
    },
    {
      id: "prod-e",
      name: "[Produk E]",
      sku: "SKU-0005",
      categoryId: "cat-3",
      costPrice: 11_000,
      price: 18_000,
      isActive: true,
    },
    {
      id: "prod-f",
      name: "[Produk F]",
      sku: "SKU-0006",
      categoryId: "cat-3",
      costPrice: 39_000,
      price: 55_000,
      isActive: true,
    },
    {
      id: "prod-g",
      name: "[Produk G]",
      sku: "SKU-0007",
      categoryId: "cat-4",
      costPrice: 20_000,
      price: 29_000,
      isActive: true,
    },
    {
      id: "prod-h",
      name: "[Produk H]",
      sku: "SKU-0008",
      categoryId: "cat-4",
      costPrice: 30_000,
      price: 42_000,
      isActive: true,
    },
  ];

  const stocks = [
    { branchId: "br-main", productId: "prod-a", quantity: 24, minStock: 5 },
    { branchId: "br-main", productId: "prod-b", quantity: 3, minStock: 5 },
    { branchId: "br-main", productId: "prod-c", quantity: 40, minStock: 5 },
    { branchId: "br-main", productId: "prod-d", quantity: 12, minStock: 5 },
    { branchId: "br-main", productId: "prod-e", quantity: 58, minStock: 5 },
    { branchId: "br-main", productId: "prod-f", quantity: 5, minStock: 5 },
    { branchId: "br-main", productId: "prod-g", quantity: 19, minStock: 5 },
    { branchId: "br-main", productId: "prod-h", quantity: 31, minStock: 5 },
    {
      branchId: "br-bandung",
      productId: "prod-a",
      quantity: 12,
      minStock: 5,
    },
    {
      branchId: "br-bandung",
      productId: "prod-b",
      quantity: 8,
      minStock: 5,
    },
    {
      branchId: "br-bandung",
      productId: "prod-c",
      quantity: 0,
      minStock: 5,
    },
    {
      branchId: "br-bandung",
      productId: "prod-d",
      quantity: 6,
      minStock: 5,
    },
    {
      branchId: "br-bandung",
      productId: "prod-e",
      quantity: 25,
      minStock: 5,
    },
    {
      branchId: "br-bandung",
      productId: "prod-f",
      quantity: 9,
      minStock: 5,
    },
    {
      branchId: "br-bandung",
      productId: "prod-g",
      quantity: 14,
      minStock: 5,
    },
    {
      branchId: "br-bandung",
      productId: "prod-h",
      quantity: 4,
      minStock: 5,
    },
  ];

  const productById = new Map(products.map((product) => [product.id, product]));

  function makeTransactionItem(
    productId: string,
    quantity: number,
  ): TransactionItem {
    const product = productById.get(productId);

    if (!product) {
      throw new Error(`Produk seed ${productId} tidak ditemukan`);
    }

    return {
      productId,
      productName: product.name,
      unitPrice: product.price,
      unitCost: product.costPrice,
      quantity,
      lineTotal: product.price * quantity,
    };
  }

  const transaction086Items = [
    makeTransactionItem("prod-a", 3),
    makeTransactionItem("prod-d", 1),
    makeTransactionItem("prod-e", 1),
  ];
  const transaction085Items = [
    makeTransactionItem("prod-c", 1),
    makeTransactionItem("prod-e", 1),
    makeTransactionItem("prod-g", 1),
  ];
  const transaction084Items = [
    makeTransactionItem("prod-a", 10),
    makeTransactionItem("prod-d", 4),
    makeTransactionItem("prod-e", 2),
  ];
  const transaction083Items = [
    makeTransactionItem("prod-f", 1),
    makeTransactionItem("prod-e", 1),
    makeTransactionItem("prod-c", 1),
  ];

  const transactions: Transaction[] = [
    {
      id: "trx-2910-086",
      invoiceNumber: "INV-2910-086",
      branchId: "br-main",
      cashierId: "emp-cashier-lala",
      salesEmployeeId: "emp-sales-rina",
      items: transaction086Items,
      subtotal: sumItems(transaction086Items),
      discount: { type: "nominal", value: 0, amount: 0 },
      total: sumItems(transaction086Items),
      payment: { method: "QRIS" },
      createdAt: "2026-10-29T13:12:00+07:00",
    },
    {
      id: "trx-2910-085",
      invoiceNumber: "INV-2910-085",
      branchId: "br-main",
      cashierId: "emp-cashier-lala",
      salesEmployeeId: null,
      items: transaction085Items,
      subtotal: sumItems(transaction085Items),
      discount: { type: "nominal", value: 0, amount: 0 },
      total: sumItems(transaction085Items),
      payment: { method: "Cash", cashReceived: 100_000, change: 28_000 },
      createdAt: "2026-10-29T13:05:00+07:00",
    },
    {
      id: "trx-2910-084",
      invoiceNumber: "INV-2910-084",
      branchId: "br-bandung",
      cashierId: "emp-cashier-fajar",
      salesEmployeeId: null,
      items: transaction084Items,
      subtotal: sumItems(transaction084Items),
      discount: { type: "nominal", value: 0, amount: 0 },
      total: sumItems(transaction084Items),
      payment: { method: "Transfer", bankAccountId: "bca" },
      createdAt: "2026-10-29T12:48:00+07:00",
    },
    {
      id: "trx-2910-083",
      invoiceNumber: "INV-2910-083",
      branchId: "br-main",
      cashierId: "emp-cashier-lala",
      salesEmployeeId: null,
      items: transaction083Items,
      subtotal: sumItems(transaction083Items),
      discount: { type: "nominal", value: 0, amount: 0 },
      total: sumItems(transaction083Items),
      payment: { method: "QRIS" },
      createdAt: "2026-10-29T12:30:00+07:00",
    },
  ];

  function makeOrderItem(productId: string, quantity: number): SalesOrderItem {
    const product = productById.get(productId);

    if (!product) {
      throw new Error(`Produk seed ${productId} tidak ditemukan`);
    }

    return {
      productId,
      productName: product.name,
      unitPrice: product.price,
      unitCost: product.costPrice,
      quantity,
    };
  }

  const order014Items = [
    makeOrderItem("prod-a", 10),
    makeOrderItem("prod-d", 4),
  ];
  const order013Items = [makeOrderItem("prod-a", 24)];
  const order011Items = [makeOrderItem("prod-h", 6)];
  const order009Items = [
    makeOrderItem("prod-d", 6),
    makeOrderItem("prod-e", 6),
  ];

  const salesOrders: SalesOrder[] = [
    {
      id: "so-2910-014",
      orderNumber: "SO-2910-014",
      customerName: "Bu Sari",
      customerPhone: "0812-3456-7890",
      branchId: "br-main",
      salesEmployeeId: "emp-sales-rina",
      items: order014Items,
      total: sumItems(order014Items),
      status: "Belum sinkron",
      stockApplied: false,
      note: "",
      createdAt: "2026-10-29T11:40:00+07:00",
    },
    {
      id: "so-2910-013",
      orderNumber: "SO-2910-013",
      customerName: "Toko Makmur",
      customerPhone: "0813-2222-1111",
      branchId: "br-main",
      salesEmployeeId: "emp-sales-rina",
      items: order013Items,
      total: sumItems(order013Items),
      status: "Menunggu bayar",
      stockApplied: false,
      note: "Kirim sore",
      createdAt: "2026-10-29T10:20:00+07:00",
    },
    {
      id: "so-2810-011",
      orderNumber: "SO-2810-011",
      customerName: "Pak Joko",
      customerPhone: "0857-1111-2222",
      branchId: "br-main",
      salesEmployeeId: "emp-sales-rina",
      items: order011Items,
      total: sumItems(order011Items),
      status: "Lunas",
      paidAt: "2026-10-28T15:10:00+07:00",
      stockApplied: true,
      note: "",
      createdAt: "2026-10-28T15:10:00+07:00",
    },
    {
      id: "so-2710-009",
      orderNumber: "SO-2710-009",
      customerName: "Bu Wati",
      customerPhone: "0819-3333-4444",
      branchId: "br-main",
      salesEmployeeId: "emp-sales-rina",
      items: order009Items,
      total: sumItems(order009Items),
      status: "Lunas",
      paidAt: "2026-10-27T09:45:00+07:00",
      stockApplied: true,
      note: "",
      createdAt: "2026-10-27T09:45:00+07:00",
    },
  ];

  const stockIns: StockInRecord[] = [
    {
      id: "si-01",
      branchId: "br-main",
      items: [
        { productId: "prod-a", productName: "[Produk A]", quantity: 40 },
        { productId: "prod-e", productName: "[Produk E]", quantity: 80 },
      ],
      date: "2026-10-27",
      note: "Restock dari supplier utama",
      userId: "emp-inventory-bayu",
      createdAt: "2026-10-27T09:15:00+07:00",
    },
    {
      id: "si-02",
      branchId: "br-bandung",
      items: [
        { productId: "prod-b", productName: "[Produk B]", quantity: 24 },
        { productId: "prod-d", productName: "[Produk D]", quantity: 12 },
      ],
      date: "2026-10-28",
      note: "Kiriman gudang pusat",
      userId: "emp-supervisor",
      createdAt: "2026-10-28T10:40:00+07:00",
    },
  ];

  const stockOpnames: StockOpnameRecord[] = [
    {
      id: "op-01",
      branchId: "br-main",
      items: [
        {
          productId: "prod-b",
          productName: "[Produk B]",
          systemQuantity: 8,
          physicalQuantity: 3,
          difference: -5,
        },
        {
          productId: "prod-f",
          productName: "[Produk F]",
          systemQuantity: 7,
          physicalQuantity: 5,
          difference: -2,
        },
      ],
      date: "2026-10-29",
      note: "Koreksi opname bulanan",
      userId: "emp-inventory-bayu",
      createdAt: "2026-10-29T12:51:00+07:00",
    },
  ];

  const stockTransfers: StockTransferRecord[] = [
    {
      id: "tr-01",
      fromBranchId: "br-main",
      toBranchId: "br-bandung",
      items: [
        { productId: "prod-a", productName: "[Produk A]", quantity: 10 },
      ],
      date: "2026-10-28",
      note: "Penyeimbangan stok cabang",
      userId: "emp-inventory-bayu",
      createdAt: "2026-10-28T14:20:00+07:00",
    },
  ];

  // Empat hari kerja terakhir; cukup untuk mengisi tabel harian dan rekap bulanan.
  const attendanceDays = [
    "2026-10-26",
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
  ];
  const attendance: AttendanceRecord[] = [];

  attendanceDays.forEach((date, dayIndex) => {
    employees.forEach((employee, employeeIndex) => {
      const isSick =
        (employee.id === "emp-inventory-bayu" && date === "2026-10-27") ||
        (employee.id === "emp-sales-dimas" && date === "2026-10-29");
      const isLeave =
        employee.id === "emp-supervisor" && date === "2026-10-29"
          ? true
          : employee.id === "emp-cashier-lala" && date === "2026-10-28";
      const isAbsent =
        employee.id === "emp-staff-agus" && date === "2026-10-26";

      const status = isSick
        ? ("Sakit" as const)
        : isLeave
          ? ("Izin" as const)
          : isAbsent
            ? ("Alpa" as const)
            : ("Hadir" as const);
      const startMinute = 47 + ((employeeIndex * 3 + dayIndex) % 20);
      const checkIn = `${String(7 + Math.floor(startMinute / 60)).padStart(
        2,
        "0",
      )}:${String(startMinute % 60).padStart(2, "0")}`;

      attendance.push({
        id: `att-${employeeIndex + 1}-${dayIndex + 1}`,
        employeeId: employee.id,
        branchId: employee.branchId,
        date,
        status,
        checkIn: status === "Hadir" ? checkIn : undefined,
        checkOut: status === "Hadir" ? "17:05" : undefined,
      });
    });
  });

  const leaveRequests: LeaveRequest[] = [
    {
      id: "leave-01",
      employeeId: "emp-cashier-lala",
      branchId: "br-main",
      date: "2026-10-30",
      reason: "Acara keluarga di luar kota",
      status: "Menunggu",
      createdAt: "2026-10-29T16:20:00+07:00",
    },
    {
      id: "leave-02",
      employeeId: "emp-supervisor",
      branchId: "br-bandung",
      date: "2026-10-29",
      reason: "Sakit demam, ada surat dokter",
      status: "Disetujui",
      reviewedBy: "emp-manager",
      reviewedAt: "2026-10-28T09:10:00+07:00",
      createdAt: "2026-10-28T08:40:00+07:00",
    },
    {
      id: "leave-03",
      employeeId: "emp-cashier-fajar",
      branchId: "br-bandung",
      date: "2026-10-27",
      reason: "Keperluan pribadi",
      status: "Ditolak",
      reviewedBy: "emp-manager",
      reviewedAt: "2026-10-26T15:05:00+07:00",
      createdAt: "2026-10-26T14:30:00+07:00",
    },
  ];

  const activityLogs: ActivityLog[] = [
    {
      id: "log-01",
      at: "2026-10-29T13:12:00+07:00",
      userId: "emp-cashier-lala",
      userName: "Lala",
      role: ROLES.CASHIER,
      branchId: "br-main",
      action: "Membayar",
      detail: "Transaksi INV-2910-086 · Rp 185.000",
    },
    {
      id: "log-02",
      at: "2026-10-29T12:51:00+07:00",
      userId: "emp-inventory-bayu",
      userName: "Bayu",
      role: ROLES.INVENTORY,
      branchId: "br-main",
      action: "Mengubah",
      detail: "Stok [Produk B] 8 → 3 (koreksi opname)",
    },
    {
      id: "log-03",
      at: "2026-10-29T11:40:00+07:00",
      userId: "emp-sales-rina",
      userName: "Rina",
      role: ROLES.SALES,
      branchId: "br-main",
      action: "Membuat",
      detail: "Pesanan SO-2910-013 · Toko Makmur",
    },
    {
      id: "log-04",
      at: "2026-10-29T10:05:00+07:00",
      userId: "emp-manager",
      userName: "Hendra",
      role: ROLES.MANAGER,
      branchId: "br-main",
      action: "Mengubah",
      detail: "Harga jual [Produk D] Rp 60.000 → Rp 62.000",
    },
    {
      id: "log-05",
      at: "2026-10-29T09:30:00+07:00",
      userId: "emp-cashier-fajar",
      userName: "Fajar",
      role: ROLES.CASHIER,
      branchId: "br-bandung",
      action: "Membatalkan",
      detail: "Transaksi INV-2910-012 · alasan: salah input",
    },
    {
      id: "log-06",
      at: "2026-10-29T08:02:00+07:00",
      userId: "emp-accountant-dewi",
      userName: "Dewi",
      role: ROLES.ACCOUNTANT,
      branchId: "br-main",
      action: "Membuka",
      detail: "Laporan bulanan Oktober",
    },
  ];

  return {
    schemaVersion: 3,
    branches,
    employees,
    categories,
    products,
    stocks,
    stockIns,
    stockOpnames,
    stockTransfers,
    transactions,
    drafts: [],
    salesOrders,
    attendance,
    leaveRequests,
    settings: {
      business: {
        name: "CV. Karya Putra Ragil",
        address: "Jl. Malioboro No. 88, Yogyakarta",
        phone: "0274-512345",
      },
      payment: {
        enabledMethods: ["Cash", "QRIS", "Transfer"],
        bankAccounts: [
          {
            id: "bca",
            bankName: "Bank BCA",
            accountNumber: "1234567890",
            accountHolder: "CV. Karya Putra Ragil",
          },
          {
            id: "bri",
            bankName: "Bank BRI",
            accountNumber: "0021-01-000123-30-1",
            accountHolder: "CV. Karya Putra Ragil",
          },
          {
            id: "mandiri",
            bankName: "Bank Mandiri",
            accountNumber: "1370-00-1234567-8",
            accountHolder: "CV. Karya Putra Ragil",
          },
        ],
      },
      salesBonusPerPiece: 5_000,
      salesBonus: DEFAULT_SALES_BONUS,
      receipt: {
        paperSize: 80,
        footerText:
          "Terima kasih telah berbelanja.\nBarang yang sudah dibeli tidak dapat ditukar.",
      },
      attendance: DEFAULT_ATTENDANCE,
    },
    activityLogs,
    session: {
      currentEmployeeId: "emp-owner",
      activeBranchId: "br-main",
    },
  };
}
