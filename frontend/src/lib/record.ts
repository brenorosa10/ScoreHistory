export function drawCount(
  played: number,
  wins: number,
  losses: number,
  draws?: number | null,
): number {
  if (draws != null && Number.isFinite(draws)) {
    return Math.max(0, draws);
  }
  return Math.max(0, played - wins - losses);
}

/** Wins divided by decided matches. Draws stay out of the percentage. */
export function winRatePercent(wins: number, losses: number): number {
  const decided = wins + losses;
  if (decided <= 0) {
    return 0;
  }
  return Math.round((wins * 100) / decided);
}

export const WIN_RATE_HINT = "Empates não entram neste %";

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function recordSummary(wins: number, draws: number, losses: number): string {
  const parts = [
    countLabel(wins, "vitória", "vitórias"),
    countLabel(losses, "derrota", "derrotas"),
  ];
  if (draws > 0) {
    parts.splice(1, 0, countLabel(draws, "empate", "empates"));
  }
  return parts.join(" · ");
}

export function h2hScore(wins: number, losses: number, draws: number): string {
  if (draws <= 0) {
    return `${wins}-${losses}`;
  }
  return `${wins}-${losses} · ${countLabel(draws, "empate", "empates")}`;
}
