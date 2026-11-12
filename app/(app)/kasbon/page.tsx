import type { Metadata } from "next";
import { KasbonPageContent } from "@/features/kasbon/components/KasbonPageContent";

export const metadata: Metadata = {
  title: "Kasbon",
};

export default function KasbonPage() {
  return <KasbonPageContent />;
}
