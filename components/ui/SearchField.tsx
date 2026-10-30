import type { ChangeEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type SearchFieldSize = "sm" | "md";

interface SearchFieldProps {
  label: string;
  placeholder: string;
  size?: SearchFieldSize;
  className?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

const SIZE_CLASSES: Record<
  SearchFieldSize,
  { wrapper: string; icon: number }
> = {
  sm: {
    wrapper: "h-[42px] gap-2.5 rounded-control px-3",
    icon: 16,
  },
  md: {
    wrapper: "h-[46px] gap-2.5 rounded-control-lg px-[14px]",
    icon: 18,
  },
};

export function SearchField({
  label,
  placeholder,
  size = "sm",
  className,
  defaultValue,
  value,
  onChange,
}: SearchFieldProps) {
  const styles = SIZE_CLASSES[size];

  return (
    <label
      className={cn(
        "flex items-center border border-line-strong bg-surface focus-within:border-brand",
        styles.wrapper,
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      <Icon
        name="search"
        size={styles.icon}
        strokeWidth={2}
        className="text-ink-muted"
      />
      <input
        type="search"
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        className="min-w-0 flex-1 border-0 bg-transparent font-sans text-body text-ink outline-none"
      />
    </label>
  );
}
