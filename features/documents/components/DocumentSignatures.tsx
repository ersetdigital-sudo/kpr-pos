import { cn } from "@/lib/cn";

export interface DocumentSignatureItem {
  title: string;
  role?: string;
  name?: string;
}

interface DocumentSignaturesProps {
  items: readonly DocumentSignatureItem[];
  variant?: "a4" | "dot";
  className?: string;
}

/** Deretan kotak tanda tangan dengan tinggi sama untuk A4 dan dot matrix. */
export function DocumentSignatures({
  items,
  variant = "a4",
  className,
}: DocumentSignaturesProps) {
  const isDot = variant === "dot";

  return (
    <div
      className={cn(
        "grid gap-2",
        isDot ? "text-[7px]" : "text-[8.5px]",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
      }}
    >
      {items.map((item) => (
        <div
          key={`${item.title}-${item.role ?? ""}`}
          className={cn(
            "flex flex-col border border-black px-1.5 text-center",
            isDot ? "min-h-[42px] py-1" : "min-h-[62px] py-1.5",
          )}
        >
          <div
            className={cn(
              "flex flex-1 items-end justify-center pb-0.5 font-semibold",
              isDot ? "text-[8px]" : "text-[9px]",
            )}
          >
            {item.name ?? ""}
          </div>
          <div className="border-t border-black pt-0.5">
            <div className="font-semibold">{item.title}</div>
            {item.role ? (
              <div
                className={cn(
                  "uppercase",
                  isDot ? "text-[6px] leading-tight" : "text-[7px] leading-tight",
                )}
              >
                {item.role}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
