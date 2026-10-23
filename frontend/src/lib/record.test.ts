import { describe, expect, it } from "vitest";
import { drawCount, h2hScore, recordSummary, winRatePercent } from "@/lib/record";

describe("win rate and draws", () => {
  it("excludes draws from the percentage and names them in the record", () => {
    const wins = 2;
    const losses = 1;
    const played = 4;
    const draws = drawCount(played, wins, losses);

    expect(draws).toBe(1);
    expect(winRatePercent(wins, losses)).toBe(67);
    expect(recordSummary(wins, draws, losses)).toBe("2 vitórias · 1 empate · 1 derrota");
    expect(h2hScore(wins, losses, draws)).toBe("2-1 · 1 empate");
  });

  it("uses an explicit draws count when the API sends one", () => {
    expect(drawCount(4, 2, 1, 1)).toBe(1);
    expect(winRatePercent(0, 0)).toBe(0);
    expect(recordSummary(2, 0, 1)).toBe("2 vitórias · 1 derrota");
    expect(h2hScore(2, 0, 0)).toBe("2-0");
  });

  it("rounds halves away from zero", () => {
    expect(winRatePercent(1, 1)).toBe(50);
    expect(winRatePercent(1, 7)).toBe(13);
  });
});
