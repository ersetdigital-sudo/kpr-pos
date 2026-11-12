import type { Metadata } from "next";
import { BukuKasPageContent } from "@/features/buku-kas/components/BukuKasPageContent";

export const metadata: Metadata = {
  title: "Buku Kas",
};

export default function BukuKasPage() {
  return <BukuKasPageContent />;
}
