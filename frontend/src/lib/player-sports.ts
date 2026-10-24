import { RACKET_SPORTS, normalizeRacketSport, type RacketSport } from "@/lib/racket-sport";
import { isValidScore, type ScoreEntry } from "@/lib/score";

export const PLAYER_SPORTS = RACKET_SPORTS;
export type PlayerSport = RacketSport;

const LAST_MATCH_SPORT_KEY = "scorehistory:last-match-sport";

export function parsePlayerSports(values: readonly string[] | null | undefined): PlayerSport[] {
  const sports: PlayerSport[] = [];
  for (const value of values ?? []) {
    const sport = normalizeRacketSport(value);
    if ((values ?? []).includes(value) && (value === "Tênis" || value === "Padel" || value === "Beach tennis")) {
      if (!sports.includes(sport)) {
        sports.push(sport);
      }
    }
  }
  return sports;
}

export function sportsOrTennis(values: readonly string[] | null | undefined): PlayerSport[] {
  const sports = parsePlayerSports(values);
  return sports.length > 0 ? sports : ["Tênis"];
}

export function shouldAskMatchSport(userSports: readonly string[] | null | undefined): boolean {
  return parsePlayerSports(userSports).length > 1;
}

export function readLastMatchSport(): PlayerSport | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  const stored = localStorage.getItem(LAST_MATCH_SPORT_KEY);
  return stored === "Tênis" || stored === "Padel" || stored === "Beach tennis" ? stored : null;
}

export function rememberMatchSport(sport: string): void {
  const normalized = parsePlayerSports([sport])[0];
  if (normalized && typeof localStorage !== "undefined") {
    localStorage.setItem(LAST_MATCH_SPORT_KEY, normalized);
  }
}

/** One sport is implicit. Several sports fall back to the last match, then Tênis if the user plays it, then the first selected sport. */
export function defaultMatchSport(
  userSports: readonly string[] | null | undefined,
  lastUsed: string | null | undefined = readLastMatchSport(),
): PlayerSport {
  const sports = sportsOrTennis(userSports);
  if (sports.length === 1) {
    return sports[0];
  }

  const last = parsePlayerSports(lastUsed ? [lastUsed] : [])[0];
  if (last && sports.includes(last)) {
    return last;
  }

  if (sports.includes("Tênis")) {
    return "Tênis";
  }

  return sports[0];
}

export function courtApplies(sport: string | null | undefined): boolean {
  return normalizeKnown(sport) === "Tênis";
}

export function isDoublesSport(sport: string | null | undefined): boolean {
  const known = normalizeKnown(sport);
  return known === "Padel" || known === "Beach tennis";
}

export function opponentPlaysSport(
  opponentSports: readonly string[] | null | undefined,
  sport: string,
): boolean {
  const known = normalizeKnown(sport);
  if (!known) {
    return false;
  }
  return parsePlayerSports(opponentSports).includes(known);
}

export function filterOpponentsBySport<T extends { sports?: readonly string[] | null }>(
  opponents: readonly T[],
  sport: string | null | undefined,
): T[] {
  const known = normalizeKnown(sport);
  if (!known) {
    return [...opponents];
  }
  return opponents.filter((opponent) => opponentPlaysSport(opponent.sports, known));
}

/**
 * Tennis and padel use regulation sets (6-0..6-4, 7-5, 7-6) plus a super tie-break in brackets.
 * Beach tennis accepts the same scores: events may be one set or no-ad, and a 7-6 tie-break or
 * super tie-break is common. We do not require best-of-three or reject a single set.
 */
export function isValidScoreForSport(entries: ScoreEntry[], sport: string | null | undefined): boolean {
  if (!normalizeKnown(sport)) {
    return false;
  }
  return isValidScore(entries);
}

export type SportRecord = {
  sport: PlayerSport;
  played: number;
  wins: number;
  losses: number;
  draws: number;
};

export function summarizeBySport(
  matches: readonly { sport?: string | null; won: boolean | null }[],
): SportRecord[] {
  const map = new Map<PlayerSport, SportRecord>();
  for (const match of matches) {
    const sport = normalizeKnown(match.sport) ?? "Tênis";
    const current = map.get(sport) ?? { sport, played: 0, wins: 0, losses: 0, draws: 0 };
    current.played += 1;
    if (match.won === true) {
      current.wins += 1;
    } else if (match.won === false) {
      current.losses += 1;
    } else {
      current.draws += 1;
    }
    map.set(sport, current);
  }
  return PLAYER_SPORTS.flatMap((sport) => {
    const record = map.get(sport);
    return record ? [record] : [];
  });
}

export function headToHeadBySport(
  matches: readonly { opponentId: string; sport?: string | null; won: boolean | null }[],
): { opponentId: string; sport: PlayerSport; played: number; wins: number; losses: number }[] {
  const map = new Map<string, { opponentId: string; sport: PlayerSport; played: number; wins: number; losses: number }>();
  for (const match of matches) {
    const sport = normalizeKnown(match.sport) ?? "Tênis";
    const key = `${match.opponentId}:${sport}`;
    const current = map.get(key) ?? { opponentId: match.opponentId, sport, played: 0, wins: 0, losses: 0 };
    current.played += 1;
    if (match.won === true) {
      current.wins += 1;
    } else if (match.won === false) {
      current.losses += 1;
    }
    map.set(key, current);
  }
  return [...map.values()];
}

function normalizeKnown(sport: string | null | undefined): PlayerSport | null {
  if (sport === "Tênis" || sport === "Padel" || sport === "Beach tennis") {
    return sport;
  }
  return null;
}
