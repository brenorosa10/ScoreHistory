import { describe, expect, it } from "vitest";
import {
  formatScore,
  isIncompleteSet,
  isRegulationSet,
  parseScore,
  resultMismatchMessage,
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
      expect(scoreFieldError(sets(score)), score).toBeNull();
    }
  });

  it("accepts a match stopped before the set was finished", () => {
    for (const score of ["4-1", "1-4", "3-2", "5-5", "6-5", "6-6", "6-4 4-1", "4-6 2-1", "1-2 5-3"]) {
      const [homeGames, awayGames] = score.split(" ")[0].split("-").map(Number);
      expect(isIncompleteSet(homeGames, awayGames) || isRegulationSet(homeGames, awayGames), score).toBe(true);
      expect(scoreFieldError(sets(score)), score).toBeNull();
    }
  });

  it("warns when an unfinished score disagrees with the marked result", () => {
    expect(scoreFieldError(sets("4-1"))).toBeNull();
    expect(resultMismatchMessage(sets("4-1"), "false")).toBe(
      "O placar aponta vitória, mas você marcou derrota.",
    );
    expect(resultMismatchMessage(sets("1-2 5-3"), "true")).toBe(
      "O placar está empatado. Marque empate ou ajuste os games.",
    );
    expect(resultMismatchMessage(sets("3-3"), "draw")).toBeNull();
  });

  it("rejects impossible sets", () => {
    for (const score of ["0-0", "7-7", "7-0", "0-7", "7-4", "4-7", "8-6", "99-1"]) {
      expect(scoreFieldError(sets(score)), score).toBe("Placar inválido");
    }

    expect(scoreFieldError([{ kind: "set", home: "-1", away: "4" }])).toBe("Placar inválido");
    expect(scoreFieldError([{ kind: "set", home: "abc", away: "1" }])).toBe("Placar inválido");
    expect(scoreFieldError([{ kind: "set", home: "", away: "" }])).toBe("Placar inválido");
  });

  it("keeps super tie-break notation such as 4-6 6-3 [3-7]", () => {
    const score = "4-6 6-3 [3-7]";
    expect(formatScore(parseScore(score))).toBe(score);
    expect(scoreFieldError(sets(score))).toBeNull();
    expect(resultMismatchMessage(sets(score), "true")).toBe(
      "O placar aponta derrota, mas você marcou vitória.",
    );
  });

  it("keeps set tie-breaks in parentheses", () => {
    const score = "6-4 7-6(7-4)";
    expect(formatScore(parseScore(score))).toBe(score);
    expect(scoreFieldError(sets(score))).toBeNull();
    expect(scoreFieldError(sets("7-6(5)"))).toBeNull();
  });
});

describe("result consistency", () => {
  it("warns on a win when the score is a loss, without blocking", () => {
    expect(scoreFieldError(sets("0-6"))).toBeNull();
    expect(resultMismatchMessage(sets("0-6"), "true")).toBe(
      "O placar aponta derrota, mas você marcou vitória.",
    );
  });

  it("warns on a draw when the score has a winner", () => {
    expect(scoreFieldError(sets("6-0"))).toBeNull();
    expect(resultMismatchMessage(sets("6-0"), "draw")).toBe(
      "O placar aponta vitória, mas você marcou empate.",
    );
  });

  it("warns when the sets are split and a winner is marked", () => {
    expect(resultMismatchMessage(sets("6-4 4-6"), "draw")).toBeNull();
    expect(scoreFieldError(sets("6-4 4-6"))).toBeNull();
    expect(resultMismatchMessage(sets("6-4 4-6"), "true")).toBe(
      "O placar está empatado. Marque empate ou ajuste os games.",
    );
  });

  it("reports an invalid score and skips the result warning", () => {
    expect(scoreFieldError(sets("7-0"))).toBe("Placar inválido");
    expect(resultMismatchMessage(sets("7-0"), "draw")).toBeNull();
  });
});
