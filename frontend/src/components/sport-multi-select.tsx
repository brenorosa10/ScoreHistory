import { PLAYER_SPORTS, type PlayerSport } from "@/lib/player-sports";
import { cn } from "@/lib/utils";

type SportMultiSelectProps = {
  value: readonly string[];
  onChange: (sports: PlayerSport[]) => void;
  invalid?: boolean;
};

export function SportMultiSelect({ value, onChange, invalid }: SportMultiSelectProps) {
  const selected = new Set(value);

  function toggle(sport: PlayerSport) {
    const next = PLAYER_SPORTS.filter((item) => (item === sport ? !selected.has(item) : selected.has(item)));
    onChange(next);
  }

  return (
    <div role="group" aria-label="Esportes" className="grid gap-2">
      {PLAYER_SPORTS.map((sport) => {
        const active = selected.has(sport);
        return (
          <button
            key={sport}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(sport)}
            className={cn(
              "flex h-12 items-center justify-between rounded-xl border px-4 text-left text-sm font-medium transition-colors outline-none",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active ? "border-primary bg-primary/10 text-foreground" : "bg-background text-muted-foreground",
              invalid && !active && "border-destructive/40",
            )}
          >
            {sport}
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full border text-[0.65rem]",
                active ? "border-primary bg-primary text-primary-foreground" : "border-input",
              )}
              aria-hidden
            >
              {active ? "✓" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
