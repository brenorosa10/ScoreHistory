import type { RacketRecord, RacketServiceKind, RacketServiceRecord } from "@/lib/api";
import { daysSince } from "@/lib/format";

export type LatestServiceHit = {
  service: RacketServiceRecord;
  racket: RacketRecord;
};

export function latestServiceAcross(
  rackets: RacketRecord[],
  kinds: RacketServiceKind[],
): LatestServiceHit | undefined {
  let best: LatestServiceHit | undefined;
  for (const racket of rackets) {
    for (const service of racket.services) {
      if (!kinds.includes(service.kind)) continue;
      if (!best || service.changedAt > best.service.changedAt) {
        best = { service, racket };
      }
    }
  }
  return best;
}

export type WearTone = "fresh" | "aging" | "worn";

export function wearTone(changedAt: string | null | undefined, warnAfterDays: number): WearTone | null {
  if (!changedAt) return null;
  const days = daysSince(changedAt);
  if (days >= warnAfterDays * 2) return "worn";
  if (days >= warnAfterDays) return "aging";
  return "fresh";
}

export const WEAR_TONE_CLASS: Record<WearTone, string> = {
  fresh: "bg-success/12 text-success",
  aging: "bg-warning/15 text-warning",
  worn: "bg-destructive/12 text-destructive",
};

export const WEAR_STRIPE_CLASS: Record<WearTone, string> = {
  fresh: "bg-success",
  aging: "bg-warning",
  worn: "bg-destructive",
};

export const BALL_WARN_DAYS = 14;
export const OVERGRIP_WARN_DAYS = 21;
export const STRING_WARN_DAYS = 45;
