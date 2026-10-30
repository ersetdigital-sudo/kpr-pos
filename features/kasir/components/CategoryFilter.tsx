interface CategoryFilterProps {
  categories: readonly string[];
}

export function CategoryFilter({ categories }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="h-9 cursor-pointer rounded-pill border-0 bg-ink px-3.5 font-sans text-label font-semibold text-white"
      >
        Semua
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          className="h-9 cursor-pointer rounded-pill border border-line-strong bg-surface px-3.5 font-sans text-label font-semibold text-ink"
        >
          {category}
        </button>
      ))}
    </div>
  );
}
