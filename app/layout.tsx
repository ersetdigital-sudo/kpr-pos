import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "POS Management System",
    template: "%s · POS Management System",
  },
  description: "POS Management System CV. Karya Putra Ragil",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className="min-h-screen bg-canvas font-sans text-ink">
        {children}
      </body>
    </html>
  );
}
