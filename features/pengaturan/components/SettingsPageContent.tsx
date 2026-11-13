"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { AttendanceSettingsCard } from "@/features/pengaturan/components/AttendanceSettingsCard";
import { BranchDocumentSettingsCard } from "@/features/pengaturan/components/BranchDocumentSettingsCard";
import { BusinessProfileCard } from "@/features/pengaturan/components/BusinessProfileCard";
import { PaymentSettingsCard } from "@/features/pengaturan/components/PaymentSettingsCard";
import { ReceiptSettingsCard } from "@/features/pengaturan/components/ReceiptSettingsCard";
import { SalesBonusCard } from "@/features/pengaturan/components/SalesBonusCard";
import { TaxSettingsCard } from "@/features/pengaturan/components/TaxSettingsCard";
import { usePengaturanData } from "@/features/pengaturan/data/pengaturan-repository";
import { buildReceiptPreview } from "@/features/pengaturan/data/pengaturan-calculations";
import { usePermissions } from "@/features/session/data/session-repository";
import type { AppDatabase } from "@/lib/store/types";

export function SettingsPageContent() {
  const database = usePengaturanData();
  const permissions = usePermissions();

  if (!database) {
    return (
      <>
        <PageHeader title="Pengaturan" subtitle="Memuat pengaturan…" />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-body text-ink-muted">
            Menyiapkan data…
          </div>
        </div>
      </>
    );
  }

  if (!permissions.canManageSettings) {
    return (
      <>
        <PageHeader
          title="Pengaturan"
          subtitle="Hanya Owner yang bisa mengubah pengaturan"
        />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <Card className="p-6">
            <h2 className="m-0 text-panel-title font-bold text-ink">
              Akses terbatas
            </h2>
            <p className="mt-2 mb-0 text-body text-ink-muted">
              Pengaturan usaha, pembayaran, bonus, struk, dan jam kerja hanya
              bisa diubah oleh Owner.
            </p>
          </Card>
        </div>
      </>
    );
  }

  return <SettingsBody database={database} />;
}

function SettingsBody({ database }: { database: AppDatabase }) {
  const preview = buildReceiptPreview(database);

  return (
    <>
      <PageHeader
        title="Pengaturan"
        subtitle="Profil usaha, pembayaran, bonus, struk, dan jam kerja"
      />

      <div className="grid items-start gap-[18px] p-4 sm:p-5 lg:px-7 lg:py-5 xl:grid-cols-2">
        <BusinessProfileCard business={database.settings.business} />
        <BranchDocumentSettingsCard
          branches={database.branches}
          activeBranchId={database.session.activeBranchId}
        />
        <PaymentSettingsCard payment={database.settings.payment} />
        <TaxSettingsCard rate={database.settings.taxRate} />
        <SalesBonusCard settings={database.settings.salesBonus} />
        <ReceiptSettingsCard
          settings={database.settings.receipt}
          preview={preview}
        />
        <AttendanceSettingsCard settings={database.settings.attendance} />
      </div>
    </>
  );
}
