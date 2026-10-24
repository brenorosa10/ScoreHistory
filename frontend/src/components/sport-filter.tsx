import { PLAYER_SPORTS, type PlayerSport } from "@/lib/player-sports";
import { cn } from "@/lib/utils";

type SportFilterProps = {
  sports: readonly string[];
  value: string | undefined;
  onChange: (sport: PlayerSport | undefined) => void;
};

export function SportFilter({ sports, value, onChange }: SportFilterProps) {
  const options = PLAYER_SPORTS.filter((sport) => sports.includes(sport));
  if (options.length < 2) {
    return null;
  }

  return (
    <div role="radiogroup" aria-label="Filtrar por esporte" className="flex flex-wrap gap-2">
      <FilterChip selected={!value} onClick={() => onChange(undefined)} label="Todos" />
      {options.map((sport) => (
        <FilterChip key={sport} selected={value === sport} onClick={() => onChange(sport)} label={sport} />
      ))}
    </div>
  );
}

function FilterChip({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "h-9 rounded-full border px-3 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        selected ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}
