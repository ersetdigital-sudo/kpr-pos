import Image from "next/image";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <Card className="w-full max-w-[420px] rounded-panel p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo-kpr.png"
            alt="Logo usaha"
            width={72}
            height={74}
            priority
            className="object-contain"
          />
          <div className="mt-3 text-overline font-bold tracking-[0.08em] text-brand">
            POS MANAGEMENT SYSTEM
          </div>
          <h1 className="mt-1 text-page-title font-extrabold text-ink">
            {title}
          </h1>
          <p className="mt-1 text-body text-ink-muted">{description}</p>
        </div>

        <div className="mt-6">{children}</div>
      </Card>
    </main>
  );
}
