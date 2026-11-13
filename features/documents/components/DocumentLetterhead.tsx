import type { DocumentLetterhead as Letterhead } from "@/features/documents/types";

interface DocumentLetterheadProps {
  letterhead: Letterhead;
  variant: "a4" | "dot_matrix";
}

/** Kop dokumen; semua bagian kosong tidak dirender. */
export function DocumentLetterhead({
  letterhead,
  variant,
}: DocumentLetterheadProps) {
  if (variant === "dot_matrix") {
    const contact = [
      letterhead.businessPhone ? `Telp. ${letterhead.businessPhone}` : "",
      letterhead.npwp ? `NPWP ${letterhead.npwp}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    return (
      <header className="border-b border-black pb-1 text-center">
        {letterhead.businessName ? (
          <div className="text-[13px] font-bold tracking-wide uppercase">
            {letterhead.businessName}
          </div>
        ) : null}
        {letterhead.businessAddress ? (
          <div className="mt-0.5 text-[9px] leading-tight">
            {letterhead.businessAddress}
          </div>
        ) : null}
        {contact ? (
          <div className="mt-0.5 text-[9px] leading-tight">{contact}</div>
        ) : null}
      </header>
    );
  }

  const hasContact = Boolean(letterhead.businessPhone || letterhead.npwp);

  return (
    <header className="flex items-start gap-4 border-b-2 border-ink pb-4">
      {letterhead.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={letterhead.logoUrl}
          alt=""
          className="h-16 w-16 shrink-0 object-contain"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        {letterhead.businessName ? (
          <h1 className="m-0 text-[20px] leading-tight font-extrabold tracking-wide text-black uppercase">
            {letterhead.businessName}
          </h1>
        ) : null}
        {letterhead.businessAddress ? (
          <p className="mt-1 mb-0 text-[11px] leading-snug text-black">
            {letterhead.businessAddress}
          </p>
        ) : null}
        {hasContact ? (
          <p className="mt-1 mb-0 text-[11px] leading-snug text-black">
            {letterhead.businessPhone ? `Telp. ${letterhead.businessPhone}` : ""}
            {letterhead.businessPhone && letterhead.npwp ? " · " : ""}
            {letterhead.npwp ? `NPWP ${letterhead.npwp}` : ""}
          </p>
        ) : null}
      </div>
    </header>
  );
}
