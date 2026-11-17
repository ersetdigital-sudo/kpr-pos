export const ACTIVITY_ACTIONS = [
  "Membuat",
  "Mengubah",
  "Menghapus",
  "Menggabungkan",
  "Membayar",
  "Membatalkan",
  "Refund",
  "Membuka",
  "Mencetak",
] as const;

export type ActivityActionName = (typeof ACTIVITY_ACTIONS)[number];
