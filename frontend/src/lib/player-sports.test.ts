import { describe, expect, it } from "vitest";
import {
  defaultMatchSport,
  filterOpponentsBySport,
  headToHeadBySport,
  isValidScoreForSport,
  shouldAskMatchSport,
  summarizeBySport,
} from "@/lib/player-sports";
import { emptySet, emptyTiebreak, type ScoreEntry } from "@/lib/score";

function set(home: string, away: string, tbHome?: string, tbAway?: string): ScoreEntry {
  return { kind: "set", home, away, tbHome, tbAway };
}

describe("shouldAskMatchSport", () => {
  it("asks only when the player has more than one sport", () => {
    expect(shouldAskMatchSport(["Tênis"])).toBe(false);
    expect(shouldAskMatchSport([])).toBe(false);
    expect(shouldAskMatchSport(undefined)).toBe(false);
    expect(shouldAskMatchSport(["Tênis", "Padel"])).toBe(true);
    expect(shouldAskMatchSport(["Padel", "Beach tennis"])).toBe(true);
  });
});

describe("defaultMatchSport", () => {
  it("uses the only sport without asking", () => {
    expect(defaultMatchSport(["Beach tennis"], "Tênis")).toBe("Beach tennis");
  });

  it("prefers the last used sport when the player has several", () => {
    expect(defaultMatchSport(["Tênis", "Padel", "Beach tennis"], "Padel")).toBe("Padel");
  });

  it("falls back to tennis, then the first sport", () => {
    expect(defaultMatchSport(["Padel", "Tênis"], "Futebol")).toBe("Tênis");
    expect(defaultMatchSport(["Beach tennis", "Padel"], null)).toBe("Beach tennis");
  });
});

describe("filterOpponentsBySport", () => {
  const opponents = [
    { id: "a", sports: ["Tênis"] },
    { id: "b", sports: ["Padel", "Beach tennis"] },
    { id: "c", sports: ["Tênis", "Padel"] },
  ];

  it("keeps opponents who play the selected sport", () => {
    expect(filterOpponentsBySport(opponents, "Padel").map((item) => item.id)).toEqual(["b", "c"]);
    expect(filterOpponentsBySport(opponents, "Beach tennis").map((item) => item.id)).toEqual(["b"]);
    expect(filterOpponentsBySport(opponents, "Tênis").map((item) => item.id)).toEqual(["a", "c"]);
  });
});

describe("score validation per sport", () => {
  const valid = [
    set("6", "0"),
    set("6", "4"),
    set("0", "6"),
    set("7", "5"),
    set("7", "6", "7", "5"),
    set("6", "7", "4", "7"),
    emptyTiebreak(),
  ];

  it("accepts regulation sets and a super tie-break for tennis, padel and beach tennis", () => {
    const entries = [set("6", "4"), set("7", "6", "7", "3")];
    const superSet = [set("6", "3"), { kind: "tiebreak" as const, home: "10", away: "8" }];
    for (const sport of ["Tênis", "Padel", "Beach tennis"]) {
      expect(isValidScoreForSport(entries, sport)).toBe(true);
      expect(isValidScoreForSport(superSet, sport)).toBe(true);
      expect(isValidScoreForSport([set("6", "4")], sport)).toBe(true);
    }
    expect(valid.every((entry) => entry.kind === "tiebreak" || entry.home !== entry.away || true)).toBe(true);
  });

  it("rejects unfinished or illegal sets for every sport", () => {
    for (const sport of ["Tênis", "Padel", "Beach tennis"]) {
      expect(isValidScoreForSport([emptySet()], sport)).toBe(false);
      expect(isValidScoreForSport([set("6", "5")], sport)).toBe(false);
      expect(isValidScoreForSport([set("8", "6")], sport)).toBe(false);
      expect(isValidScoreForSport([set("7", "6")], sport)).toBe(true);
      expect(isValidScoreForSport([set("7", "6", "7", "7")], sport)).toBe(false);
    }
  });
});

describe("stats per sport", () => {
  const matches = [
    { opponentId: "ana", sport: "Tênis", won: true },
    { opponentId: "ana", sport: "Tênis", won: false },
    { opponentId: "ana", sport: "Padel", won: true },
    { opponentId: "bia", sport: "Beach tennis", won: null },
  ];

  it("summarizes win rate inputs separately", () => {
    expect(summarizeBySport(matches)).toEqual([
      { sport: "Tênis", played: 2, wins: 1, losses: 1, draws: 0 },
      { sport: "Padel", played: 1, wins: 1, losses: 0, draws: 0 },
      { sport: "Beach tennis", played: 1, wins: 0, losses: 0, draws: 1 },
    ]);
  });

  it("splits head to head for the same opponent by sport", () => {
    expect(headToHeadBySport(matches)).toEqual([
      { opponentId: "ana", sport: "Tênis", played: 2, wins: 1, losses: 1 },
      { opponentId: "ana", sport: "Padel", played: 1, wins: 1, losses: 0 },
      { opponentId: "bia", sport: "Beach tennis", played: 1, wins: 0, losses: 0 },
    ]);
  });
});
