import type { Customer } from "@/lib/store/types";

export interface CustomerInput {
  id?: string;
  name: string;
  phone: string;
  /** Alamat untuk kop dokumen cetak. */
  address?: string;
  /** NPWP untuk kop dokumen cetak. */
  npwp?: string;
  /** Penanda boleh tempo; hanya role berwenang yang bisa mengubah. */
  allowTempo: boolean;
  branchId?: string;
}

export interface CustomerRow extends Customer {
  /** Jumlah pesanan COD/Tempo yang belum lunas milik pelanggan ini. */
  activeCreditCount: number;
  activeTempo: boolean;
}

export type CustomerActionResult =
  | { ok: true; data: Customer }
  | { ok: false; error: string };
