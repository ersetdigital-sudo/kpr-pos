import type { Metadata } from "next";
import { CabangPageContent } from "@/features/cabang/components/CabangPageContent";

export const metadata: Metadata = {
  title: "Cabang",
};

export default function CabangPage() {
  return <CabangPageContent />;
}
