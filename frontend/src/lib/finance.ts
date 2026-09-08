import type { FinancePayload, FinanceRecord } from "@/lib/api";
import { dateInputToIso, moneyToInput, parseMoney, toDateInputValue } from "@/lib/format";

export type FinanceFormValues = {
  lessonPrice: string;
  clubPrice: string;
  ballCanPrice: string;
  stringPrice: string;
  overgripPrice: string;
  cushionGripPrice: string;
  ballName: string;
  lastBallCanOpenedAt: string;
  racketPrices: Record<string, string>;
};

export function emptyFinanceForm(): FinanceFormValues {
  return {
    lessonPrice: "",
    clubPrice: "",
    ballCanPrice: "",
    stringPrice: "",
    overgripPrice: "",
    cushionGripPrice: "",
    ballName: "",
    lastBallCanOpenedAt: "",
    racketPrices: {},
  };
}

export function financeToForm(finance: FinanceRecord): FinanceFormValues {
  return {
    lessonPrice: moneyToInput(finance.lessonPrice),
    clubPrice: moneyToInput(finance.clubPrice),
    ballCanPrice: moneyToInput(finance.ballCanPrice),
    stringPrice: moneyToInput(finance.stringPrice),
    overgripPrice: moneyToInput(finance.overgripPrice),
    cushionGripPrice: moneyToInput(finance.cushionGripPrice),
    ballName: finance.ballName ?? "",
    lastBallCanOpenedAt: toDateInputValue(finance.lastBallCanOpenedAt),
    racketPrices: Object.fromEntries(
      finance.rackets.map((racket) => [racket.id, moneyToInput(racket.purchasePrice)]),
    ),
  };
}

export function financeToPayload(finance: FinanceRecord): FinancePayload {
  return {
    lessonPrice: finance.lessonPrice,
    clubPrice: finance.clubPrice,
    ballCanPrice: finance.ballCanPrice,
    stringPrice: finance.stringPrice,
    overgripPrice: finance.overgripPrice,
    cushionGripPrice: finance.cushionGripPrice,
    ballName: finance.ballName,
    lastBallCanOpenedAt: finance.lastBallCanOpenedAt,
  };
}

export function moneyFieldRule(value: string) {
  return !value.trim() || parseMoney(value) != null || "Informe um valor válido.";
}

export function formToFinancePayload(
  values: FinanceFormValues,
  includeRackets: boolean,
): FinancePayload {
  return {
    lessonPrice: parseMoney(values.lessonPrice),
    clubPrice: parseMoney(values.clubPrice),
    ballCanPrice: parseMoney(values.ballCanPrice),
    stringPrice: parseMoney(values.stringPrice),
    overgripPrice: parseMoney(values.overgripPrice),
    cushionGripPrice: parseMoney(values.cushionGripPrice),
    ballName: values.ballName,
    lastBallCanOpenedAt: dateInputToIso(values.lastBallCanOpenedAt),
    rackets: includeRackets
      ? Object.entries(values.racketPrices).map(([id, price]) => ({
          id,
          purchasePrice: parseMoney(price),
        }))
      : undefined,
  };
}
