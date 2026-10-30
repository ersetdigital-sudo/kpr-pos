import { cn } from "@/lib/cn";

const TABS = [
  "Daftar Produk",
  "Kategori",
  "Stok Masuk",
  "Stok Opname",
  "Transfer Antar Cabang",
] as const;

export function ProductTabs() {
  return (
    <div
      role="tablist"
      aria-label="Bagian stok"
      className="flex flex-wrap gap-1 border-b border-line-strong"
    >
      {TABS.map((tab, index) => {
        const active = index === 0;

        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "h-11 cursor-pointer border-x-0 border-t-0 border-b-[3px] bg-transparent px-4 font-sans text-body",
              active
                ? "border-brand font-bold text-ink"
                : "border-transparent font-semibold text-ink-muted",
            )}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
