import type { RacketServiceKind } from "@/lib/api";
import { SERVICE_KIND_ORDER } from "@/lib/racket-service";

export const RACKET_SPORTS = ["Tênis", "Padel", "Beach tennis"] as const;

export type RacketSport = (typeof RACKET_SPORTS)[number];

export const DEFAULT_RACKET_SPORT: RacketSport = "Tênis";

export function normalizeRacketSport(value: string | null | undefined): RacketSport {
  if (value === "Padel" || value === "Beach tennis") {
    return value;
  }
  return DEFAULT_RACKET_SPORT;
}

export function racketHasStrings(sport: string | null | undefined): boolean {
  return normalizeRacketSport(sport) === "Tênis";
}

export function serviceKindsForSport(sport: string | null | undefined): RacketServiceKind[] {
  if (racketHasStrings(sport)) {
    return [...SERVICE_KIND_ORDER];
  }
  return SERVICE_KIND_ORDER.filter((kind) => kind !== "Corda");
}

export function sportLabel(sport: string | null | undefined): string {
  return normalizeRacketSport(sport);
}
