const SATUAN = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];

function terbilangPositif(value: number): string {
  if (value < 12) return SATUAN[value];
  if (value < 20) return `${SATUAN[value - 10]} belas`;
  if (value < 100) {
    return `${terbilangPositif(Math.floor(value / 10))} puluh ${terbilangPositif(
      value % 10,
    )}`.trim();
  }
  if (value < 200) {
    return `seratus ${terbilangPositif(value - 100)}`.trim();
  }
  if (value < 1000) {
    return `${terbilangPositif(Math.floor(value / 100))} ratus ${terbilangPositif(
      value % 100,
    )}`.trim();
  }
  if (value < 2000) {
    return `seribu ${terbilangPositif(value - 1000)}`.trim();
  }
  if (value < 1_000_000) {
    return `${terbilangPositif(Math.floor(value / 1000))} ribu ${terbilangPositif(
      value % 1000,
    )}`.trim();
  }
  if (value < 1_000_000_000) {
    return `${terbilangPositif(
      Math.floor(value / 1_000_000),
    )} juta ${terbilangPositif(value % 1_000_000)}`.trim();
  }
  if (value < 1_000_000_000_000) {
    return `${terbilangPositif(
      Math.floor(value / 1_000_000_000),
    )} miliar ${terbilangPositif(value % 1_000_000_000)}`.trim();
  }

  return `${terbilangPositif(
    Math.floor(value / 1_000_000_000_000),
  )} triliun ${terbilangPositif(value % 1_000_000_000_000)}`.trim();
}

/** Angka menjadi kata bahasa Indonesia, contoh 125000 -> "seratus dua puluh lima ribu". */
export function numberToWords(value: number): string {
  if (!Number.isFinite(value)) return "nol";

  const rounded = Math.round(Math.abs(value));
  const words =
    rounded === 0 ? "nol" : terbilangPositif(rounded).replace(/\s+/g, " ").trim();

  return value < 0 ? `minus ${words}` : words;
}

/** Terbilang nominal rupiah lengkap dengan satuan. */
export function terbilangRupiah(value: number): string {
  return `${numberToWords(value)} rupiah`;
}
