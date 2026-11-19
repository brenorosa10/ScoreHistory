import { describe, expect, it } from "vitest";
import {
  formatScore,
  isIncompleteSet,
  isRegulationSet,
  parseScore,
  scoreFieldError,
  type ScoreEntry,
} from "@/lib/score";

function sets(score: string): ScoreEntry[] {
  return parseScore(score);
}

describe("regulation set scores", () => {
  it("accepts 6-0 through 6-4, 7-5 and 7-6 in both directions", () => {
    for (const score of ["6-0", "6-1", "6-2", "6-3", "6-4", "0-6", "4-6", "7-5", "5-7", "7-6", "6-7"]) {
      const [home, away] = score.split("-").map(Number);
      expect(isRegulationSet(home, away), score).toBe(true);
      expect(scoreFieldError(sets(score), home > away ? "true" : "false"), score).toBeNull();
    }
  });

  it("accepts a match stopped before the set was finished", () => {
    const cases: Array<[string, "true" | "false" | "draw"]> = [
      ["4-1", "true"],
      ["1-4", "false"],
      ["3-2", "true"],
      ["5-5", "draw"],
      ["6-5", "true"],
      ["6-6", "draw"],
      ["6-4 4-1", "true"],
      ["4-6 2-1", "draw"],
    ];
    for (const [score, won] of cases) {
      const [homeGames, awayGames] = score.split(" ")[0].split("-").map(Number);
      expect(isIncompleteSet(homeGames, awayGames) || isRegulationSet(homeGames, awayGames), score).toBe(true);
      expect(scoreFieldError(sets(score), won), score).toBeNull();
    }
  });

  it("still derives the winner from unfinished sets", () => {
    expect(scoreFieldError(sets("4-1"), "false")).toBe(
      "O placar aponta vitória, mas você marcou derrota.",
    );
    expect(scoreFieldError(sets("6-4 4-1"), "false")).toBe(
      "O placar aponta vitória, mas você marcou derrota.",
    );
    expect(scoreFieldError(sets("3-3"), "draw")).toBeNull();
    expect(scoreFieldError(sets("3-3"), "true")).toBe(
      "O placar está empatado. Marque empate ou ajuste os games.",
    );
  });

  it("rejects impossible sets", () => {
    for (const score of ["0-0", "7-7", "7-0", "0-7", "7-4", "4-7", "8-6", "99-1"]) {
      expect(scoreFieldError(sets(score), "true"), score).toBe("Placar inválido");
    }

    expect(scoreFieldError([{ kind: "set", home: "-1", away: "4" }], "true")).toBe("Placar inválido");
    expect(scoreFieldError([{ kind: "set", home: "abc", away: "1" }], "true")).toBe("Placar inválido");
    expect(scoreFieldError([{ kind: "set", home: "", away: "" }], "true")).toBe("Placar inválido");
  });

  it("keeps super tie-break notation such as 4-6 6-3 [3-7]", () => {
    const score = "4-6 6-3 [3-7]";
    expect(formatScore(parseScore(score))).toBe(score);
    expect(scoreFieldError(sets(score), "false")).toBeNull();
    expect(scoreFieldError(sets(score), "true")).toBe(
      "O placar aponta derrota, mas você marcou vitória.",
    );
  });

  it("keeps set tie-breaks in parentheses", () => {
    const score = "6-4 7-6(7-4)";
    expect(formatScore(parseScore(score))).toBe(score);
    expect(scoreFieldError(sets(score), "true")).toBeNull();
    expect(scoreFieldError(sets("7-6(5)"), "true")).toBeNull();
  });
});

describe("result consistency", () => {
  it("rejects a win when the score is a loss", () => {
    expect(scoreFieldError(sets("0-6"), "true")).toBe(
      "O placar aponta derrota, mas você marcou vitória.",
    );
  });

  it("rejects a draw when the score has a winner", () => {
    expect(scoreFieldError(sets("6-0"), "draw")).toBe(
      "O placar aponta vitória, mas você marcou empate.",
    );
  });

  it("accepts a draw only when the sets are split", () => {
    expect(scoreFieldError(sets("6-4 4-6"), "draw")).toBeNull();
    expect(scoreFieldError(sets("6-4 4-6"), "true")).toBe(
      "O placar está empatado. Marque empate ou ajuste os games.",
    );
  });

  it("reports an invalid score before the result mismatch", () => {
    expect(scoreFieldError(sets("7-0"), "draw")).toBe("Placar inválido");
  });
});
