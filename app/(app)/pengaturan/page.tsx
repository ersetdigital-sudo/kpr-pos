import type { Metadata } from "next";
import { SettingsPageContent } from "@/features/pengaturan/components/SettingsPageContent";

export const metadata: Metadata = {
  title: "Pengaturan",
};

export default function PengaturanPage() {
  return <SettingsPageContent />;
}
