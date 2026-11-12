"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/Toast";
import {
  buildBonusMonthReport,
  buildBonusYearReport,
  parseMonthKey,
  toMonthKey,
} from "@/features/bonus/data/bonus-calculations";
import { exportBonusExcel } from "@/features/bonus/data/bonus-excel";
import { BonusPrintSheet } from "@/features/bonus/components/BonusPrintSheet";
import { fetchReportSourceAction } from "@/features/laporan/cloud-actions";
import {
  usePermissions,
  useSession,
} from "@/features/session/data/session-repository";
import { useHydratedDatabase } from "@/lib/store/store";
import {
  formatDateTimeShort,
  formatNumber,
  formatRupiah,
  formatRupiahCompact,
} from "@/lib/format";
import type { AppDatabase } from "@/lib/store/types";

export function BonusPageContent() {
  const database = useHydratedDatabase();
  const { branch, branches } = useSession();
  const permissions = usePermissions();
  const { showToast } = useToast();

  if (!database) {
    return (
      <>
        <PageHeader title="Bonus Sales" subtitle="Memuat data bonus…" />
        <div className="p-4 sm:p-5 lg:px-7 lg:py-6">
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-body text-ink-muted">
            Menyiapkan data…
          </div>
        </div>
      </>
    );
  }

  return (
    <BonusBody
      database={database}
      branch={branch}
      branches={branches}
      canViewAllBranches={permissions.canViewAllBranches}
      canExport={permissions.canExportReports}
      onNotify={showToast}
    />
  );
}

interface BonusBodyProps {
  database: AppDatabase;
  branch: ReturnType<typeof useSession>["branch"];
  branches: ReturnType<typeof useSession>["branches"];
  canViewAllBranches: boolean;
  canExport: boolean;
  onNotify: (message: string, tone?: "success" | "error" | "info") => void;
}

function BonusBody({
  database,
  branch,
  branches,
  canViewAllBranches,
  canExport,
  onNotify,
}: BonusBodyProps) {
  const [monthKey, setMonthKey] = useState(() => toMonthKey(new Date()));
  const [branchId, setBranchId] = useState<string>("all");
  const [remote, setRemote] = useState<{
    transactions: AppDatabase["transactions"];
    salesOrders: AppDatabase["salesOrders"];
  } | null>(null);

  const branchScope = canViewAllBranches ? branchId : branch.id;
  const { year } = parseMonthKey(monthKey);

  useEffect(() => {
    let active = true;

    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);

    void fetchReportSourceAction({
      start: start.toISOString(),
      end: end.toISOString(),
      branchId: branchScope,
    })
      .then((result) => {
        if (!active) return;
        setRemote({
          transactions: result.transactions,
          salesOrders: result.salesOrders,
        });
      })
      .catch((error) => {
        console.error("Gagal memuat data bonus:", error);
      });

    return () => {
      active = false;
    };
  }, [year, branchScope]);

  const loading = remote === null;
  const scopedDatabase = useMemo(
    () => (remote ? { ...database, ...remote } : database),
    [database, remote],
  );
  const monthReport = useMemo(
    () =>
      buildBonusMonthReport(
        scopedDatabase,
        monthKey,
        branchScope === "all" ? undefined : branchScope,
      ),
    [scopedDatabase, monthKey, branchScope],
  );
  const yearReport = useMemo(
    () =>
      buildBonusYearReport(
        scopedDatabase,
        year,
        branchScope === "all" ? undefined : branchScope,
      ),
    [scopedDatabase, year, branchScope],
  );

  async function handleExport() {
    try {
      await exportBonusExcel(monthReport, yearReport);
      onNotify("File Excel rekap bonus berhasil dibuat", "success");
    } catch {
      onNotify("Export Excel gagal, coba lagi", "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Bonus Sales"
        subtitle="Bonus dihitung dari pesanan/transaksi lunas; COD & Tempo masuk saat pelunasan"
        actions={
          <>
            <Input
              type="month"
              aria-label="Pilih bulan rekap bonus"
              value={monthKey}
              onChange={(event) =>
                setMonthKey(event.target.value || toMonthKey(new Date()))
              }
              className="h-[38px] w-[150px] text-label"
            />
            {canViewAllBranches ? (
              <Select
                aria-label="Filter cabang bonus"
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                className="h-[38px] w-auto max-w-[170px] text-label"
              >
                <option value="all">Semua Cabang</option>
                {branches.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            ) : null}
            {canExport ? (
              <>
                <Button variant="outline" size="md" onClick={handleExport}>
                  Export Excel
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => window.print()}
                >
                  Cetak / PDF
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:px-7 lg:py-6">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <StatCard
            label="Total Bonus Bulan Ini"
            value={formatRupiahCompact(monthReport.totalBonus)}
            hint={monthReport.monthLabel}
            valueTone="brand"
          />
          <StatCard
            label="Pcs Terjual"
            value={formatNumber(monthReport.totalQuantity)}
            hint={`${monthReport.entries.filter((entry) => entry.quantity > 0).length} sales aktif`}
          />
          <StatCard
            label="Nominal Penjualan"
            value={formatRupiahCompact(monthReport.totalNominal)}
            hint={monthReport.ruleLabel}
          />
          <StatCard
            label={`Akumulasi ${year}`}
            value={formatRupiahCompact(yearReport.totalBonus)}
            hint={`${yearReport.perSales.length} sales menerima bonus`}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
          <Card className="flex min-w-0 flex-col p-5">
            <CardHeader
              title="Rekap per Sales"
              subtitle={`${monthReport.monthLabel} · ${monthReport.ruleLabel}`}
              action={
                loading ? (
                  <span className="text-meta text-ink-muted">Memuat…</span>
                ) : (
                  <span className="text-meta text-ink-muted">
                    {monthReport.entries.length} sales
                  </span>
                )
              }
              className="mb-3"
            />

            <ul className="divide-y divide-line-faint rounded-control border border-line">
              {monthReport.entries.length === 0 ? (
                <li className="px-4 py-8 text-center text-body text-ink-muted">
                  Belum ada sales aktif.
                </li>
              ) : null}
              {monthReport.entries.map((entry, index) => (
                <li
                  key={entry.salesEmployeeId}
                  className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canvas text-meta font-bold text-ink-soft">
                        {index + 1}
                      </span>
                      <span className="truncate text-body font-semibold text-ink">
                        {entry.salesName}
                      </span>
                    </div>
                    <p className="m-0 mt-1 pl-8 text-meta text-ink-muted">
                      {entry.orderCount} transaksi ·{" "}
                      {formatNumber(entry.quantity)} pcs ·{" "}
                      {formatRupiah(entry.nominal)}
                    </p>
                  </div>
                  <div className="shrink-0 pl-8 text-left sm:pl-0 sm:text-right">
                    <div className="text-meta text-ink-muted">Bonus</div>
                    <div className="text-card-title font-extrabold whitespace-nowrap text-ink">
                      {formatRupiah(entry.bonus)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex min-w-0 flex-col p-5">
            <CardHeader
              title="Rincian Transaksi"
              subtitle="Hanya pesanan lunas dan transaksi kasir yang tidak direfund"
              action={
                <span className="text-meta text-ink-muted">
                  {monthReport.transactions.length} transaksi
                </span>
              }
              className="mb-3"
            />

            <ul className="divide-y divide-line-faint rounded-control border border-line">
              {monthReport.transactions.length === 0 ? (
                <li className="px-4 py-8 text-center text-body text-ink-muted">
                  Belum ada transaksi lunas pada bulan ini.
                </li>
              ) : null}
              {monthReport.transactions.map((row) => (
                <li key={`${row.source}-${row.id}`} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <span className="text-body font-semibold text-ink">
                        {row.salesName}
                      </span>
                      <span className="ml-2 text-meta text-ink-muted">
                        {row.number} · {row.source}
                      </span>
                    </div>
                    <span className="text-body font-bold whitespace-nowrap text-ink">
                      {formatRupiah(row.nominal)}
                    </span>
                  </div>
                  <p className="m-0 text-meta text-ink-muted">
                    {formatDateTimeShort(row.at)}
                    {row.customerName !== "-" ? ` · ${row.customerName}` : ""}
                    {` · ${formatNumber(row.quantity)} pcs · ${row.branchName}`}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="flex min-w-0 flex-col p-5">
          <CardHeader
            title={`Akumulasi Bonus ${year}`}
            subtitle="Bonus dihitung per bulan (tier bulanan), lalu dijumlahkan per tahun"
            className="mb-3"
          />

          <div className="mb-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {yearReport.monthLabels.map((label, index) => (
              <div
                key={label}
                className="min-w-[92px] shrink-0 rounded-control border border-line bg-canvas px-3 py-2"
              >
                <div className="text-meta text-ink-muted">{label}</div>
                <div className="text-label font-bold whitespace-nowrap text-ink">
                  {formatRupiahCompact(yearReport.monthTotals[index] ?? 0)}
                </div>
              </div>
            ))}
          </div>

          <ul className="divide-y divide-line-faint rounded-control border border-line">
            {yearReport.perSales.length === 0 ? (
              <li className="px-4 py-8 text-center text-body text-ink-muted">
                Belum ada bonus pada tahun ini.
              </li>
            ) : null}
            {yearReport.perSales.map((row) => (
              <li
                key={row.salesEmployeeId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-body font-semibold text-ink">
                    {row.salesName}
                  </div>
                  <div className="text-meta text-ink-muted">
                    {formatNumber(row.quantity)} pcs ·{" "}
                    {formatRupiah(row.nominal)}
                  </div>
                </div>
                <span className="shrink-0 text-body font-extrabold whitespace-nowrap text-brand">
                  {formatRupiah(row.totalBonus)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <BonusPrintSheet
        month={monthReport}
        year={yearReport}
        business={database.settings.business}
      />
    </>
  );
}
