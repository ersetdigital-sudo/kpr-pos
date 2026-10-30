"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { findNavItemByPath } from "@/config/navigation";
import { useSession } from "@/features/session/data/session-repository";

export function AccessDenied() {
  const pathname = usePathname();
  const { employee, branch } = useSession();
  const item = findNavItemByPath(pathname);
  const target = item ? `halaman ${item.label}` : "halaman ini";

  return (
    <>
      <PageHeader
        title="Akses ditolak"
        subtitle={`Role ${employee.role} tidak punya akses ke ${target}`}
      />

      <div className="flex flex-1 items-start justify-center p-4 sm:p-5 lg:p-7">
        <Card className="w-full max-w-xl p-6">
          <h2 className="m-0 text-panel-title font-bold text-ink">
            Halaman tidak tersedia untuk role ini
          </h2>
          <p className="mt-2 mb-0 text-body text-ink-muted">
            Menu dan tombol mengikuti role karyawan yang sedang dipakai. Ganti
            user lewat dropdown <strong>Masuk sebagai</strong> di header, atau
            kembali ke dashboard.
          </p>

          <dl className="mt-4 grid gap-2 rounded-control bg-canvas p-3 text-label sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Karyawan aktif</dt>
              <dd className="m-0 font-semibold text-ink">
                {employee.name} · {employee.role}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Cabang aktif</dt>
              <dd className="m-0 font-semibold text-ink">{branch.name}</dd>
            </div>
          </dl>

          <Link
            href="/dashboard"
            className="mt-5 inline-flex h-10 items-center rounded-control bg-brand px-4 text-body font-bold text-white"
          >
            Kembali ke Dashboard
          </Link>
        </Card>
      </div>
    </>
  );
}
