import { ROLES } from "@/constants/roles";
import type {
  ActivityLog,
  AppDatabase,
  Branch,
  Employee,
  Product,
  SalesOrder,
  SalesOrderItem,
  Transaction,
  TransactionItem,
} from "@/lib/store/types";

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
      initials: "NA",
      role: ROLES.OWNER,
      branchId: "br-main",
      isActive: true,
    },
    {
      id: "emp-manager",
      name: "Hendra",
      initials: "HD",
      role: ROLES.MANAGER,
      branchId: "br-main",
      isActive: true,
    },
    {
      id: "emp-supervisor",
      name: "Sinta",
      initials: "SN",
      role: ROLES.SUPERVISOR,
      branchId: "br-bandung",
      isActive: true,
    },
    {
      id: "emp-cashier-lala",
      name: "Lala",
      initials: "LA",
      role: ROLES.CASHIER,
      branchId: "br-main",
      isActive: true,
    },
    {
      id: "emp-cashier-fajar",
      name: "Fajar",
      initials: "FA",
      role: ROLES.CASHIER,
      branchId: "br-bandung",
      isActive: true,
    },
    {
      id: "emp-inventory-bayu",
      name: "Bayu",
      initials: "BY",
      role: ROLES.INVENTORY,
      branchId: "br-main",
      isActive: true,
    },
    {
      id: "emp-accountant-dewi",
      name: "Dewi",
      initials: "DW",
      role: ROLES.ACCOUNTANT,
      branchId: "br-main",
      isActive: true,
    },
    {
      id: "emp-sales-rina",
      name: "Rina",
      initials: "RI",
      role: ROLES.SALES,
      branchId: "br-main",
      isActive: true,
    },
    {
      id: "emp-sales-dimas",
      name: "Dimas",
      initials: "DI",
      role: ROLES.SALES,
      branchId: "br-bandung",
      isActive: true,
    },
    {
      id: "emp-staff-agus",
      name: "Agus",
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
      note: "",
      createdAt: "2026-10-27T09:45:00+07:00",
    },
  ];

  const attendance = [
    {
      id: "att-01",
      employeeId: "emp-owner",
      branchId: "br-main",
      date: "2026-10-29",
      status: "Hadir" as const,
      checkIn: "07:45",
      checkOut: "17:05",
    },
    {
      id: "att-02",
      employeeId: "emp-manager",
      branchId: "br-main",
      date: "2026-10-29",
      status: "Hadir" as const,
      checkIn: "07:50",
    },
    {
      id: "att-03",
      employeeId: "emp-supervisor",
      branchId: "br-bandung",
      date: "2026-10-29",
      status: "Izin" as const,
    },
    {
      id: "att-04",
      employeeId: "emp-cashier-lala",
      branchId: "br-main",
      date: "2026-10-29",
      status: "Hadir" as const,
      checkIn: "07:55",
    },
    {
      id: "att-05",
      employeeId: "emp-cashier-fajar",
      branchId: "br-bandung",
      date: "2026-10-29",
      status: "Hadir" as const,
      checkIn: "08:00",
    },
    {
      id: "att-06",
      employeeId: "emp-inventory-bayu",
      branchId: "br-main",
      date: "2026-10-29",
      status: "Hadir" as const,
      checkIn: "07:58",
    },
    {
      id: "att-07",
      employeeId: "emp-accountant-dewi",
      branchId: "br-main",
      date: "2026-10-29",
      status: "Hadir" as const,
      checkIn: "08:05",
    },
    {
      id: "att-08",
      employeeId: "emp-sales-rina",
      branchId: "br-main",
      date: "2026-10-29",
      status: "Hadir" as const,
      checkIn: "08:10",
    },
    {
      id: "att-09",
      employeeId: "emp-sales-dimas",
      branchId: "br-bandung",
      date: "2026-10-29",
      status: "Sakit" as const,
    },
    {
      id: "att-10",
      employeeId: "emp-staff-agus",
      branchId: "br-main",
      date: "2026-10-29",
      status: "Hadir" as const,
      checkIn: "08:00",
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
    schemaVersion: 1,
    branches,
    employees,
    categories,
    products,
    stocks,
    transactions,
    drafts: [],
    salesOrders,
    attendance,
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
      receipt: {
        paperSize: 80,
        footerText:
          "Terima kasih telah berbelanja.\nBarang yang sudah dibeli tidak dapat ditukar.",
      },
    },
    activityLogs,
    session: {
      currentEmployeeId: "emp-owner",
      activeBranchId: "br-main",
    },
  };
}
