import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  headerClassName?: string;
  cellClassName?: string;
}

interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  minWidth?: number;
  density?: "compact" | "roomy";
  headerTone?: "plain" | "soft";
  rowClassName?: (row: T) => string | undefined;
  ariaLabel?: string;
}

const DENSITY_CLASSES = {
  compact: { cell: "px-1.5 py-2.5", head: "px-1.5 py-2" },
  roomy: { cell: "px-2 py-2.5", head: "px-2 py-[10px]" },
} as const;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = 560,
  density = "compact",
  headerTone = "plain",
  rowClassName,
  ariaLabel,
}: DataTableProps<T>) {
  const spacing = DENSITY_CLASSES[density];

  return (
    <div className="overflow-x-auto">
      <table
        aria-label={ariaLabel}
        className="w-full border-collapse text-body"
        style={{ minWidth }}
      >
        <thead>
          <tr
            className={cn(
              "text-left text-meta text-ink-muted",
              headerTone === "soft" && "bg-line-subtle",
            )}
          >
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={cn(
                  "font-semibold",
                  spacing.head,
                  column.align === "right" && "text-right",
                  column.headerClassName,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "border-t border-line-faint",
                rowClassName?.(row),
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    spacing.cell,
                    column.align === "right" && "text-right",
                    column.cellClassName,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
