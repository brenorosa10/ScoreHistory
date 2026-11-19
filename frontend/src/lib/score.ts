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

export type MatchResultChoice = "true" | "false" | "draw";

function wholeNumber(value: string | undefined): number | null {
  if (value == null || value.trim() === "" || !/^\d+$/.test(value.trim())) {
    return null;
  }
  return Number(value);
}

/** Games above this cannot happen in a set (a set ends at 6 or 7). */
const MAX_SET_GAMES = 7;
/** Tie-break points offered in the form; anything past this is treated as absurd. */
const MAX_TIEBREAK_POINTS = 25;

/** A completed set: 6-0..6-4, 7-5 or 7-6, and the same scores reversed. */
export function isRegulationSet(home: number, away: number): boolean {
  const high = Math.max(home, away);
  const low = Math.min(home, away);
  if (high === 6 && low <= 4) {
    return true;
  }
  return high === 7 && (low === 5 || low === 6);
}

/**
 * A set stopped early: any game count that has not reached a winning score
 * (below 6, or 6-5 / 6-6). 0-0 counts as empty, not as a played set.
 */
export function isIncompleteSet(home: number, away: number): boolean {
  if (home < 0 || away < 0 || (home === 0 && away === 0)) {
    return false;
  }
  if (home > MAX_SET_GAMES || away > MAX_SET_GAMES) {
    return false;
  }

  const high = Math.max(home, away);
  const low = Math.min(home, away);
  if (high <= 5) {
    return true;
  }
  return high === 6 && low >= 5;
}

function isValidEntry(entry: ScoreEntry): boolean {
  const home = wholeNumber(entry.home);
  const away = wholeNumber(entry.away);
  if (home == null || away == null) {
    return false;
  }

  if (entry.kind === "tiebreak") {
    return (
      home !== away &&
      home <= MAX_TIEBREAK_POINTS &&
      away <= MAX_TIEBREAK_POINTS
    );
  }

  if (!isRegulationSet(home, away) && !isIncompleteSet(home, away)) {
    return false;
  }

  const tbHomeRaw = entry.tbHome?.trim() ?? "";
  const tbAwayRaw = entry.tbAway?.trim() ?? "";
  if (!tbHomeRaw && !tbAwayRaw) {
    return true;
  }

  if (!isSetTiebreakScore(entry.home, entry.away) || !tbHomeRaw || !tbAwayRaw) {
    return false;
  }

  const tbHome = wholeNumber(tbHomeRaw);
  const tbAway = wholeNumber(tbAwayRaw);
  if (tbHome == null || tbAway == null || tbHome === tbAway) {
    return false;
  }

  return tbHome > tbAway === home > away;
}

export function isValidScore(entries: ScoreEntry[]): boolean {
  return entries.length > 0 && entries.every(isValidEntry);
}

export function resultMismatchMessage(
  entries: ScoreEntry[],
  won: MatchResultChoice,
): string | null {
  if (!isValidScore(entries)) {
    return null;
  }

  const winner = resolveWinner(entries);
  const marked = won === "draw" ? "empate" : won === "true" ? "vitória" : "derrota";

  if (won === "draw") {
    return winner === null
      ? null
      : `O placar aponta ${winner === "home" ? "vitória" : "derrota"}, mas você marcou empate.`;
  }

  if (winner === null) {
    return "O placar está empatado. Marque empate ou ajuste os games.";
  }

  const homeWon = winner === "home";
  if (homeWon !== (won === "true")) {
    return `O placar aponta ${homeWon ? "vitória" : "derrota"}, mas você marcou ${marked}.`;
  }

  return null;
}

/** Blocking message for a malformed score. A result mismatch is a warning, not an error. */
export function scoreFieldError(entries: ScoreEntry[]): string | null {
  if (!isValidScore(entries)) {
    return "Placar inválido";
  }

  return null;
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
