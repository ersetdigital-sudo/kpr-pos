import type { Metadata } from "next";
import { BonusPageContent } from "@/features/bonus/components/BonusPageContent";

export const metadata: Metadata = {
  title: "Bonus Sales",
};

export default function BonusPage() {
  return <BonusPageContent />;
}
