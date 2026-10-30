import type { Metadata } from "next";
import { KaryawanPageContent } from "@/features/karyawan/components/KaryawanPageContent";

export const metadata: Metadata = {
  title: "Karyawan & Role",
};

export default function KaryawanPage() {
  return <KaryawanPageContent />;
}
