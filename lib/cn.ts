import { extendTailwindMerge } from "tailwind-merge";

// Ukuran teks kustom harus didaftarkan agar tailwind-merge tidak
// menganggapnya sebagai warna saat menggabungkan className.
const mergeClasses = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "overline",
        "meta",
        "label",
        "body",
        "amount",
        "card-title",
        "panel-title",
        "page-title",
        "stat",
      ],
      radius: [
        "badge",
        "control",
        "control-lg",
        "card",
        "panel",
        "pill",
      ],
    },
  },
});

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return mergeClasses(classes.filter(Boolean).join(" "));
}
