"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import type { Branch } from "@/lib/store/types";
import type { CashBookPeriod } from "@/features/buku-kas/types";

const PERIOD_TABS: readonly TabItem<CashBookPeriod>[] = [
  { id: "harian", label: "Harian" },
  { id: "bulanan", label: "Bulanan" },
  { id: "tahunan", label: "Tahunan" },
];

interface CashBookFiltersProps {
  period: CashBookPeriod;
  onPeriodChange: (period: CashBookPeriod) => void;
  date: string;
  month: string;
  year: string;
  onDateChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  branchId: string;
  branches: readonly Branch[];
  onBranchChange: (branchId: string) => void;
  canFilterBranch: boolean;
  onManageCategories: () => void;
}

export function CashBookFilters({
  period,
  onPeriodChange,
  date,
  month,
  year,
  onDateChange,
  onMonthChange,
  onYearChange,
  branchId,
  branches,
  onBranchChange,
  canFilterBranch,
  onManageCategories,
}: CashBookFiltersProps) {
  return (
    <Card className="flex flex-col gap-3.5 p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="m-0 text-card-title font-bold text-ink">
            Periode Buku Kas
          </h2>
          <p className="mt-0.5 mb-0 text-label text-ink-muted">
            Pemasukan penjualan dihitung otomatis dari transaksi kasir dan
            pesanan sales yang lunas.
          </p>
        </div>
        <Button variant="outline" size="md" onClick={onManageCategories}>
          Kelola Kategori
        </Button>
      </div>

      <Tabs
        tabs={PERIOD_TABS}
        value={period}
        onChange={onPeriodChange}
        ariaLabel="Filter periode buku kas"
      />

      <div className="flex flex-wrap items-end gap-3">
        {period === "harian" ? (
          <Field label="Tanggal" labelSize="sm" className="w-full sm:w-[190px]">
            <Input
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
            />
          </Field>
        ) : null}

        {period === "bulanan" ? (
          <Field label="Bulan" labelSize="sm" className="w-full sm:w-[190px]">
            <Input
              type="month"
              value={month}
              onChange={(event) => onMonthChange(event.target.value)}
            />
          </Field>
        ) : null}

        {period === "tahunan" ? (
          <Field label="Tahun" labelSize="sm" className="w-full sm:w-[130px]">
            <Input
              type="number"
              inputMode="numeric"
              min={2000}
              max={2100}
              step={1}
              value={year}
              onChange={(event) => onYearChange(event.target.value)}
            />
          </Field>
        ) : null}

        {canFilterBranch ? (
          <Field label="Cabang" labelSize="sm" className="w-full sm:w-[220px]">
            <Select
              aria-label="Filter cabang buku kas"
              value={branchId}
              onChange={(event) => onBranchChange(event.target.value)}
            >
              <option value="all">Semua cabang</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>
    </Card>
  );
}
