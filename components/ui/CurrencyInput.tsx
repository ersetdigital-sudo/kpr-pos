import type { ChangeEvent, InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Input";
import { formatNumber } from "@/lib/format";

interface CurrencyInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "inputMode" | "prefix"
  > {
  value: number;
  /** Menerima nilai angka tanpa separator; 0 berarti kosong. */
  onValueChange: (value: number) => void;
  /** Tampilkan awalan "Rp" di dalam input. */
  prefix?: boolean;
}

/** Input nominal rupiah: hanya angka yang disimpan, tampilan otomatis ber-separator. */
export function CurrencyInput({
  value,
  onValueChange,
  prefix = true,
  className,
  ...props
}: CurrencyInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, "");
    onValueChange(digits ? Number(digits) : 0);
  }

  return (
    <div className="relative">
      {prefix ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-[10px] -translate-y-1/2 text-body text-ink-muted"
        >
          Rp
        </span>
      ) : null}
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value > 0 ? formatNumber(value) : ""}
        onChange={handleChange}
        className={cn("text-right", prefix && "pl-[34px]", className)}
      />
    </div>
  );
}
