import type { Metadata } from "next";
import { PesananPageContent } from "@/features/pesanan/components/PesananPageContent";

export const metadata: Metadata = {
  title: "Pesanan Sales",
};

export default function PesananPage() {
  return <PesananPageContent />;
}
