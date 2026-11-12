"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatDateShort, formatRupiah } from "@/lib/format";
import { KasbonStatusBadge } from "@/features/kasbon/components/KasbonStatusBadge";
import type { KasbonRecapData, KasbonRow } from "@/features/kasbon/types";

interface KasbonRecapListProps {
  data: KasbonRecapData;
  onOpenDetail: (row: KasbonRow) => void;
}

/**
 * Rekap per karyawan dengan detail yang bisa dibuka. Tanpa tabel dan tanpa
 * scroll horizontal, termasuk di mobile.
 */
export function KasbonRecapList({ data, onOpenDetail }: KasbonRecapListProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  function toggle(employeeId: string) {
    setExpanded((current) => {
      const next = new Set(current);

      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }

      return next;
    });
  }

  return (
    <Card className="flex min-w-0 flex-col p-4 sm:p-5">
      <CardHeader
        title="Rekap per karyawan"
        subtitle="Buka nama karyawan untuk melihat rincian kasbonnya."
        action={
          <span className="text-meta text-ink-muted">
            {data.rows.length} kasbon · {data.employees.length} karyawan
          </span>
        }
        className="mb-3.5"
      />

      {data.employees.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong bg-canvas px-4 py-10 text-center">
          <p className="m-0 text-body font-semibold text-ink">
            Belum ada kasbon pada filter ini
          </p>
          <p className="mt-1 mb-0 text-meta text-ink-muted">
            Coba ganti periode, cabang, karyawan, atau status rekap.
          </p>
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-line-faint overflow-hidden rounded-control border border-line p-0">
          {data.employees.map((group) => {
            const open = expanded.has(group.employeeId);
            const regionId = `kasbon-recap-${group.employeeId}`;

            return (
              <li key={group.employeeId}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={regionId}
                  onClick={() => toggle(group.employeeId)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 border-0 bg-surface px-4 py-3.5 text-left hover:bg-line-subtle"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-label font-bold text-brand"
                    >
                      {group.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-body font-semibold text-ink">
                        {group.employeeName}
                      </p>
                      <p className="m-0 text-meta text-ink-muted">
                        {group.count} kasbon · {group.branchName}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2.5">
                    <span className="text-body font-extrabold whitespace-nowrap text-ink">
                      {formatRupiah(group.totalAmount)}
                    </span>
                    <Icon
                      name="chevronDown"
                      size={16}
                      strokeWidth={2.2}
                      className={cn(
                        "text-ink-muted transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </div>
                </button>

                {open ? (
                  <ul
                    id={regionId}
                    className="m-0 list-none border-t border-line-faint bg-canvas p-0"
                  >
                    {group.rows.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => onOpenDetail(row)}
                          className="flex w-full cursor-pointer flex-col gap-2 border-0 border-t border-line-faint bg-transparent px-4 py-3 text-left first:border-t-0 hover:bg-line-subtle sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-label font-semibold text-ink">
                                {formatDateShort(row.createdAt)}
                              </span>
                              <KasbonStatusBadge status={row.status} />
                            </div>
                            <p className="m-0 mt-0.5 line-clamp-1 text-meta text-ink-muted">
                              {row.reason}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <span className="text-label font-bold whitespace-nowrap text-ink">
                              {formatRupiah(row.amount)}
                            </span>
                            <span className="text-meta font-semibold text-brand">
                              Detail
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
