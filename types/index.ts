import type { Role } from "@/constants/roles";

export type PaymentMethod = "Cash" | "QRIS" | "Transfer";

export interface SessionUser {
  name: string;
  role: Role;
  initials: string;
}
