import { cn } from "@/lib/utils";

type OptionGroupProps = {
  name: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  columns?: number;
  className?: string;
};

/** Radio group rendered as tappable chips, sized for thumbs on mobile. */
export function OptionGroup({
  name,
  options,
  value,
  onChange,
  columns,
  className,
}: OptionGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn("flex flex-wrap gap-2", columns && "grid", className)}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            name={name}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-11 rounded-xl border px-4 text-sm font-medium transition-colors outline-none",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type ResultToggleProps = {
  value: "true" | "false";
  onChange: (value: "true" | "false") => void;
};

/** Win/loss switch with color feedback, the most frequent choice in the match form. */
export function ResultToggle({ value, onChange }: ResultToggleProps) {
  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
      <button
        type="button"
        role="radio"
        aria-checked={value === "true"}
        onClick={() => onChange("true")}
        className={cn(
          "h-10 rounded-lg text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          value === "true" ? "bg-success text-white shadow-sm" : "text-muted-foreground",
        )}
      >
        Vitória
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "false"}
        onClick={() => onChange("false")}
        className={cn(
          "h-10 rounded-lg text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          value === "false" ? "bg-destructive text-white shadow-sm" : "text-muted-foreground",
        )}
      >
        Derrota
      </button>
    </div>
  );
}
