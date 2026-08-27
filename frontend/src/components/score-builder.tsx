import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  emptySet,
  emptyTiebreak,
  formatScore,
  GAME_OPTIONS,
  isSetTiebreakScore,
  TIEBREAK_POINT_OPTIONS,
  type ScoreEntry,
} from "@/lib/score";

type ScoreBuilderProps = {
  value: ScoreEntry[];
  onChange: (entries: ScoreEntry[]) => void;
};

export function ScoreBuilder({ value, onChange }: ScoreBuilderProps) {
  function update(index: number, patch: Partial<ScoreEntry>) {
    onChange(
      value.map((entry, position) => {
        if (position !== index) {
          return entry;
        }

        const next = { ...entry, ...patch };
        if (next.kind === "set" && !isSetTiebreakScore(next.home, next.away)) {
          delete next.tbHome;
          delete next.tbAway;
        }
        return next;
      }),
    );
  }

  function remove(index: number) {
    onChange(value.filter((_, position) => position !== index));
  }

  let setNumber = 0;

  return (
    <div className="grid gap-2">
      <div className="grid gap-2">
        {value.map((entry, index) => {
          const isTiebreak = entry.kind === "tiebreak";
          if (!isTiebreak) {
            setNumber += 1;
          }
          const options = isTiebreak ? TIEBREAK_POINT_OPTIONS : GAME_OPTIONS;
          const label = isTiebreak ? "Tiebreak" : `${setNumber}º set`;
          const unit = isTiebreak ? "pontos" : "games";
          const showSetTiebreak = !isTiebreak && isSetTiebreakScore(entry.home, entry.away);

          return (
            <div key={index} className="grid gap-2 rounded-xl bg-muted/60 p-2 pl-3">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm font-medium">{label}</span>

                <NativeSelect
                  aria-label={`${label} — seus ${unit}`}
                  className="w-20 px-2 pr-7 text-center"
                  value={entry.home}
                  onChange={(event) => update(index, { home: event.target.value })}
                >
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </NativeSelect>

                <span className="text-muted-foreground">–</span>

                <NativeSelect
                  aria-label={`${label} — ${unit} do adversário`}
                  className="w-20 px-2 pr-7 text-center"
                  value={entry.away}
                  onChange={(event) => update(index, { away: event.target.value })}
                >
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </NativeSelect>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover ${label}`}
                  disabled={value.length === 1}
                  onClick={() => remove(index)}
                >
                  <X />
                </Button>
              </div>

              {showSetTiebreak ? (
                <div className="flex items-center gap-2 border-t border-border/60 pt-2">
                  <span className="flex-1 text-sm text-muted-foreground">Tie-break</span>

                  <NativeSelect
                    aria-label={`${label} — seus pontos no tie-break`}
                    className="w-20 px-2 pr-7 text-center"
                    value={entry.tbHome ?? ""}
                    onChange={(event) =>
                      update(index, { tbHome: event.target.value || undefined })
                    }
                  >
                    <option value="">—</option>
                    {TIEBREAK_POINT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </NativeSelect>

                  <span className="text-muted-foreground">–</span>

                  <NativeSelect
                    aria-label={`${label} — pontos do adversário no tie-break`}
                    className="w-20 px-2 pr-7 text-center"
                    value={entry.tbAway ?? ""}
                    onChange={(event) =>
                      update(index, { tbAway: event.target.value || undefined })
                    }
                  >
                    <option value="">—</option>
                    {TIEBREAK_POINT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </NativeSelect>

                  <span className="size-9 shrink-0" aria-hidden />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={() => onChange([...value, emptySet()])}>
          <Plus />
          Set
        </Button>
        <Button type="button" variant="outline" onClick={() => onChange([...value, emptyTiebreak()])}>
          <Plus />
          Tiebreak
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Placar: <span className="font-semibold text-foreground tabular-nums">{formatScore(value)}</span>
      </p>
    </div>
  );
}
