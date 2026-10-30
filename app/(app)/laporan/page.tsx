import type { Metadata } from "next";
import { LaporanPageContent } from "@/features/laporan/components/ReportPageContent";

export const metadata: Metadata = {
  title: "Laporan",
};

export default function LaporanPage() {
  return <LaporanPageContent />;
}
