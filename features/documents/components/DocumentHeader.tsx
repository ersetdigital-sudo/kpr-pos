import { cn } from "@/lib/cn";
import type { DocumentLetterhead } from "@/features/documents/types";

/** Alamat kop dot matrix: singkatan umum, huruf kapital, dibagi dua baris. */
function formatDotAddressLines(address: string): string[] {
  const parts = address
    .replace(/Kecamatan/gi, "Kec.")
    .replace(/Kabupaten/gi, "Kab.")
    .replace(/Kode Pos/gi, "Kodepos")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 2) return [parts.join(" ")];

  const middle = Math.ceil(parts.length / 2);
  return [
    parts.slice(0, middle).join(" ").toUpperCase(),
    parts.slice(middle).join(" ").toUpperCase(),
  ];
}

interface DocumentCompanyIdentityProps {
  letterhead: DocumentLetterhead;
  variant?: "a4" | "dot";
}

/** Blok identitas usaha; dipakai kop A4 dan kop dot matrix. */
export function DocumentCompanyIdentity({
  letterhead,
  variant = "a4",
}: DocumentCompanyIdentityProps) {
  const isDot = variant === "dot";
  const lineClass = isDot
    ? "leading-tight"
    : "leading-snug whitespace-nowrap";

  return (
    <div
      className={cn(
        "min-w-0",
        isDot ? "text-[8.5px]" : "text-[9.5px]",
      )}
    >
      {letterhead.businessName ? (
        <div
          className={cn(
            "font-bold uppercase",
            isDot
              ? "text-[11px] leading-tight tracking-wide"
              : "text-[16px] leading-tight tracking-wide",
          )}
        >
          {letterhead.businessName}
        </div>
      ) : null}
      {letterhead.businessAddress ? (
        isDot ? (
          formatDotAddressLines(letterhead.businessAddress).map((line) => (
            <div key={line} className={lineClass}>
              {line}
            </div>
          ))
        ) : (
          <div className={lineClass}>{letterhead.businessAddress}</div>
        )
      ) : null}
      {letterhead.businessPhone ? (
        <div className={lineClass}>Telp. {letterhead.businessPhone}</div>
      ) : null}
      {letterhead.npwp ? (
        <div className={lineClass}>NPWP {letterhead.npwp}</div>
      ) : null}
    </div>
  );
}

interface DocumentHeaderA4Props {
  letterhead: DocumentLetterhead;
  title: string;
  badge?: "COD" | "TEMPO" | null;
}

/** Kop A4 dua kolom dengan garis tebal di bawahnya. */
export function DocumentHeaderA4({
  letterhead,
  title,
  badge = null,
}: DocumentHeaderA4Props) {
  return (
    <header className="flex items-start justify-between gap-6 border-b-[3px] border-black pb-2">
      <DocumentCompanyIdentity letterhead={letterhead} />

      <div className="shrink-0 text-right">
        <h2 className="m-0 text-[26px] leading-none font-extrabold tracking-[0.16em]">
          {title}
        </h2>
        {badge ? (
          <span className="mt-2 inline-block border border-black px-3 py-1 text-[9px] font-bold tracking-[0.18em]">
            {badge}
          </span>
        ) : null}
      </div>
    </header>
  );
}
