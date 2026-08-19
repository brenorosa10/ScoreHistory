export type ScoreEntry = {
  kind: "set" | "tiebreak";
  home: string;
  away: string;
};

export const GAME_OPTIONS = Array.from({ length: 8 }, (_, index) => String(index));
export const TIEBREAK_POINT_OPTIONS = Array.from({ length: 26 }, (_, index) => String(index));

export function emptySet(): ScoreEntry {
  return { kind: "set", home: "0", away: "0" };
}

export function emptyTiebreak(): ScoreEntry {
  return { kind: "tiebreak", home: "0", away: "0" };
}

/** Serializes to the usual tennis notation, with match tie-breaks in brackets: "6-4 3-6 [10-8]". */
export function formatScore(entries: ScoreEntry[]): string {
  return entries
    .map((entry) =>
      entry.kind === "tiebreak" ? `[${entry.home}-${entry.away}]` : `${entry.home}-${entry.away}`,
    )
    .join(" ");
}

/** Supports current notation and older scores separated by spaces or commas. */
export function parseScore(score: string): ScoreEntry[] {
  const entries = [...score.matchAll(/(\[)?(\d+)\s*-\s*(\d+)(\])?/g)].map((match) => ({
    kind: match[1] || match[4] ? ("tiebreak" as const) : ("set" as const),
    home: match[2],
    away: match[3],
  }));

  return entries.length > 0 ? entries : [emptySet()];
}

export function hasResult(entries: ScoreEntry[]): boolean {
  return entries.some((entry) => entry.home !== entry.away);
}

/** Who took more sets, so the form can warn when the score contradicts the selected result. */
export function resolveWinner(entries: ScoreEntry[]): "home" | "away" | null {
  let home = 0;
  let away = 0;

  for (const entry of entries) {
    if (Number(entry.home) > Number(entry.away)) {
      home += 1;
    } else if (Number(entry.away) > Number(entry.home)) {
      away += 1;
    }
  }

  if (home === away) {
    return null;
  }

  return home > away ? "home" : "away";
}
