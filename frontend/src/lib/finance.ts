import type { FinancePayload, FinanceRecord, RacketRecord } from "@/lib/api";
import { moneyToInput, parseMoney } from "@/lib/format";

export type FinanceFormValues = {
  lessonPrice: string;
  clubPrice: string;
  stringPrice: string;
  overgripPrice: string;
  cushionGripPrice: string;
  racketPrices: Record<string, string>;
};

export function emptyFinanceForm(): FinanceFormValues {
  return {
    lessonPrice: "",
    clubPrice: "",
    stringPrice: "",
    overgripPrice: "",
    cushionGripPrice: "",
    racketPrices: {},
  };
}

export function financeToForm(finance: FinanceRecord): FinanceFormValues {
  return {
    lessonPrice: moneyToInput(finance.lessonPrice),
    clubPrice: moneyToInput(finance.clubPrice),
    stringPrice: moneyToInput(finance.stringPrice),
    overgripPrice: moneyToInput(finance.overgripPrice),
    cushionGripPrice: moneyToInput(finance.cushionGripPrice),
    racketPrices: Object.fromEntries(
      finance.rackets.map((racket) => [racket.id, moneyToInput(racket.purchasePrice)]),
    ),
  };
}

export function ballsToPayload(
  balls: Array<{ id?: string; name?: string | null; canPrice?: number | null; lastOpenedAt?: string | null }>,
): NonNullable<FinancePayload["balls"]> {
  return balls.map((ball) => ({
    ...(ball.id ? { id: ball.id } : {}),
    name: ball.name ?? null,
    canPrice: ball.canPrice ?? null,
    lastOpenedAt: ball.lastOpenedAt ?? null,
  }));
}

export function financeToPayload(finance: FinanceRecord): FinancePayload {
  return {
    lessonPrice: finance.lessonPrice,
    clubPrice: finance.clubPrice,
    stringPrice: finance.stringPrice,
    overgripPrice: finance.overgripPrice,
    cushionGripPrice: finance.cushionGripPrice,
    balls: ballsToPayload(finance.balls ?? []),
  };
}

export function moneyFieldRule(value: string) {
  return !value.trim() || parseMoney(value) != null || "Informe um valor válido.";
}

export function formToFinancePayload(values: FinanceFormValues): FinancePayload {
  return {
    lessonPrice: parseMoney(values.lessonPrice),
    clubPrice: parseMoney(values.clubPrice),
    stringPrice: parseMoney(values.stringPrice),
    overgripPrice: parseMoney(values.overgripPrice),
    cushionGripPrice: parseMoney(values.cushionGripPrice),
    rackets: Object.entries(values.racketPrices).map(([id, price]) => ({
      id,
      purchasePrice: parseMoney(price),
    })),
  };
}

export function isSameCalendarMonth(iso: string | null | undefined, now = new Date()): boolean {
  if (!iso) {
    return false;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export type MonthlyFinanceBreakdown = {
  total: number;
  lesson: number;
  club: number;
  stringCount: number;
  overgripCount: number;
  gripCount: number;
  ballCount: number;
};

export function monthlyFinanceBreakdown(
  finance: FinanceRecord,
  rackets: RacketRecord[],
  now = new Date(),
): MonthlyFinanceBreakdown {
  let stringCount = 0;
  let overgripCount = 0;
  let gripCount = 0;

  for (const racket of rackets) {
    for (const service of racket.services ?? []) {
      if (!isSameCalendarMonth(service.changedAt, now)) {
        continue;
      }
      if (service.kind === "Corda") stringCount += 1;
      if (service.kind === "Overgrip") overgripCount += 1;
      if (service.kind === "Grip") gripCount += 1;
    }
  }

  const ballCount = (finance.balls ?? []).filter((ball) => isSameCalendarMonth(ball.lastOpenedAt, now)).length;
  const lesson = finance.lessonPrice ?? 0;
  const club = finance.clubPrice ?? 0;
  const total =
    lesson +
    club +
    stringCount * (finance.stringPrice ?? 0) +
    overgripCount * (finance.overgripPrice ?? 0) +
    gripCount * (finance.cushionGripPrice ?? 0) +
    (finance.balls ?? [])
      .filter((ball) => isSameCalendarMonth(ball.lastOpenedAt, now))
      .reduce((sum, ball) => sum + (ball.canPrice ?? 0), 0);

  return { total, lesson, club, stringCount, overgripCount, gripCount, ballCount };
}

export function monthlyFinanceHint(breakdown: MonthlyFinanceBreakdown): string {
  const parts: string[] = [];
  if (breakdown.lesson > 0) parts.push("aula");
  if (breakdown.club > 0) parts.push("clube");
  if (breakdown.overgripCount > 0) {
    parts.push(countLabel(breakdown.overgripCount, "overgrip", "overgrips"));
  }
  if (breakdown.gripCount > 0) {
    parts.push(countLabel(breakdown.gripCount, "grip", "grips"));
  }
  if (breakdown.stringCount > 0) {
    parts.push(countLabel(breakdown.stringCount, "corda", "cordas"));
  }
  if (breakdown.ballCount > 0) {
    parts.push(countLabel(breakdown.ballCount, "lata", "latas"));
  }
  return parts.length > 0 ? parts.join(" + ") : "sem gastos neste mês";
}

function countLabel(count: number, singular: string, plural: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}
