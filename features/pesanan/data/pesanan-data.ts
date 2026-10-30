import type {
  OrderDraft,
  OrderProductOption,
  SalesOrdersData,
} from "@/features/pesanan/types";

const productOptions: readonly OrderProductOption[] = [
  { id: "produk-a", name: "[Produk A]", price: 35_000 },
  { id: "produk-b", name: "[Produk B]", price: 48_000 },
  { id: "produk-c", name: "[Produk C]", price: 25_000 },
  { id: "produk-d", name: "[Produk D]", price: 62_000 },
  { id: "produk-e", name: "[Produk E]", price: 18_000 },
  { id: "produk-f", name: "[Produk F]", price: 55_000 },
  { id: "produk-g", name: "[Produk G]", price: 29_000 },
  { id: "produk-h", name: "[Produk H]", price: 42_000 },
];

function buildDraft(items: OrderDraft["items"]): OrderDraft {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => {
    const product = productOptions.find(
      (option) => option.id === item.productId,
    );

    return product ? sum + product.price * item.quantity : sum;
  }, 0);

  return { items, totalQuantity, totalAmount };
}

const orders: SalesOrdersData["orders"] = [
  {
    id: "SO-2910-014",
    customer: "Bu Sari",
    quantity: 14,
    total: 598_000,
    status: "Belum sinkron",
  },
  {
    id: "SO-2910-013",
    customer: "Toko Makmur",
    quantity: 20,
    total: 840_000,
    status: "Menunggu bayar",
  },
  {
    id: "SO-2810-011",
    customer: "Pak Joko",
    quantity: 6,
    total: 252_000,
    status: "Lunas",
  },
  {
    id: "SO-2710-009",
    customer: "Bu Wati",
    quantity: 12,
    total: 486_000,
    status: "Lunas",
  },
];

const leaderboard: SalesOrdersData["leaderboard"] = [
  {
    rank: 1,
    salesName: "Rina",
    orderCount: 14,
    soldCount: 142,
    bonus: 710_000,
    isCurrentUser: true,
  },
  {
    rank: 2,
    salesName: "Dimas",
    orderCount: 11,
    soldCount: 118,
    bonus: 590_000,
    isCurrentUser: false,
  },
  {
    rank: 3,
    salesName: "Sinta",
    orderCount: 9,
    soldCount: 97,
    bonus: 485_000,
    isCurrentUser: false,
  },
  {
    rank: 4,
    salesName: "Agus",
    orderCount: 7,
    soldCount: 64,
    bonus: 320_000,
    isCurrentUser: false,
  },
];

/** Sumber data pesanan sales; ganti isi fungsi ini saat memakai API/database. */
export function getSalesOrdersData(): SalesOrdersData {
  return {
    header: {
      title: "Pesanan Sales",
      subtitle: "Catat order yang kamu dapat, bonus dihitung otomatis",
    },
    stats: {
      soldThisMonth: 142,
      rank: 1,
      totalSalespeople: 4,
      runningBonus: 710_000,
      bonusPerPiece: 5_000,
      awaitingPaymentCount: 3,
    },
    orders,
    leaderboard,
    productOptions,
    draft: buildDraft([
      { productId: "produk-a", quantity: 10 },
      { productId: "produk-d", quantity: 4 },
    ]),
  };
}
