import type { Metadata } from "next";
import { AbsensiPageContent } from "@/features/absensi/components/AbsensiPageContent";

export const metadata: Metadata = {
  title: "Absensi",
};

export default function AbsensiPage() {
  return <AbsensiPageContent />;
}
