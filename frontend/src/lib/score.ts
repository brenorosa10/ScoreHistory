export type ScoreEntry = {
  kind: "set" | "tiebreak";
  home: string;
  away: string;
  tbHome?: string;
  tbAway?: string;
};

export const GAME_OPTIONS = Array.from({ length: 8 }, (_, index) => String(index));
export const TIEBREAK_POINT_OPTIONS = Array.from({ length: 26 }, (_, index) => String(index));

export function emptySet(): ScoreEntry {
  return { kind: "set", home: "0", away: "0" };
}

export function emptyTiebreak(): ScoreEntry {
  return { kind: "tiebreak", home: "0", away: "0" };
}

export function isSetTiebreakScore(home: string, away: string): boolean {
  return (home === "7" && away === "6") || (home === "6" && away === "7");
}

function setTiebreakWinnerPoints(loserPoints: number): number {
  return loserPoints <= 5 ? 7 : loserPoints + 2;
}

function formatSet(entry: ScoreEntry): string {
  const set = `${entry.home}-${entry.away}`;
  if (!isSetTiebreakScore(entry.home, entry.away) || !entry.tbHome || !entry.tbAway) {
    return set;
  }

  return `${set}(${entry.tbHome}-${entry.tbAway})`;
}

/** Serializes to the usual tennis notation, with match tie-breaks in brackets: "6-4 7-6(7-4) [10-8]". */
export function formatScore(entries: ScoreEntry[]): string {
  return entries
    .map((entry) => (entry.kind === "tiebreak" ? `[${entry.home}-${entry.away}]` : formatSet(entry)))
    .join(" ");
}

/** Supports current notation, set tie-breaks in parentheses, and older scores separated by spaces or commas. */
export function parseScore(score: string): ScoreEntry[] {
  const pattern =
    /\[(\d+)\s*-\s*(\d+)\]|(\d+)\s*-\s*(\d+)(?:\((\d+)(?:\s*-\s*(\d+))?\))?/g;

  const entries = [...score.matchAll(pattern)].map((match) => {
    if (match[1] != null) {
      return { kind: "tiebreak" as const, home: match[1], away: match[2] };
    }

    const home = match[3];
    const away = match[4];
    const parenFirst = match[5];
    const parenSecond = match[6];
    const entry: ScoreEntry = { kind: "set", home, away };

    if (parenFirst != null && parenSecond != null) {
      entry.tbHome = parenFirst;
      entry.tbAway = parenSecond;
    } else if (parenFirst != null) {
      const loserPoints = Number(parenFirst);
      const winnerPoints = setTiebreakWinnerPoints(loserPoints);
      if (Number(home) > Number(away)) {
        entry.tbHome = String(winnerPoints);
        entry.tbAway = parenFirst;
      } else if (Number(away) > Number(home)) {
        entry.tbHome = parenFirst;
        entry.tbAway = String(winnerPoints);
      }
    }

    return entry;
  });

  return entries.length > 0 ? entries : [emptySet()];
}

export function hasResult(entries: ScoreEntry[]): boolean {
  return entries.some((entry) => entry.home !== entry.away);
}

export function hasPlayedScore(entries: ScoreEntry[]): boolean {
  return entries.some((entry) => entry.home !== "0" || entry.away !== "0");
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
