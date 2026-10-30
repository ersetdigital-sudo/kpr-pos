import type { Metadata } from "next";
import { KasirPageContent } from "@/features/kasir/components/KasirPageContent";

export const metadata: Metadata = {
  title: "Kasir",
};

export default function KasirPage() {
  return <KasirPageContent />;
}
