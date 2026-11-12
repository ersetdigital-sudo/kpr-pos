import type { Metadata } from "next";
import { PelangganPageContent } from "@/features/pelanggan/components/PelangganPageContent";

export const metadata: Metadata = {
  title: "Pelanggan",
};

export default function PelangganPage() {
  return <PelangganPageContent />;
}
