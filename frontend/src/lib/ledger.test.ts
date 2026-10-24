import { describe, expect, it } from "vitest";
import {
  averageIntervalDays,
  categoryTotals,
  hasFee,
  recentMonthTotals,
} from "@/lib/ledger";

const expenses = [
  { occurredAt: "2026-10-02T15:00:00.000Z", category: "Aula", amount: 200 },
  { occurredAt: "2026-10-05T15:00:00.000Z", category: "Clube", amount: 80 },
  { occurredAt: "2026-10-08T15:00:00.000Z", category: "Overgrip", amount: 15 },
  { occurredAt: "2026-10-18T15:00:00.000Z", category: "Overgrip", amount: 15 },
  { occurredAt: "2026-10-20T15:00:00.000Z", category: "Bolinhas", amount: 40 },
  { occurredAt: "2026-09-03T15:00:00.000Z", category: "Aula", amount: 150 },
  { occurredAt: "2026-09-03T15:00:00.000Z", category: "Corda", amount: 90 },
];

describe("category totals from the ledger", () => {
  it("sums the saved amounts for the month and ignores later price changes", () => {
    const october = categoryTotals(expenses, "2026-10");
    expect(october.total).toBe(350);
    expect(october.Aula).toBe(200);
    expect(october.Clube).toBe(80);
    expect(october.Overgrip).toBe(30);
    expect(october.Bolinhas).toBe(40);
    expect(october.Corda).toBe(0);

    const september = categoryTotals(expenses, "2026-09");
    expect(september.total).toBe(240);
    expect(september.Aula).toBe(150);
    expect(september.Corda).toBe(90);
  });

  it("keeps a past entry when the current default price would be different", () => {
    const withNewPrice = expenses.map((expense) =>
      expense.category === "Overgrip" ? { ...expense, amount: expense.amount } : expense,
    );
    expect(categoryTotals(withNewPrice, "2026-10").Overgrip).toBe(30);
    expect(categoryTotals([{ ...expenses[2], amount: 12 }], "2026-10").Overgrip).toBe(12);
  });

  it("builds the last six months and detects launched fees", () => {
    const series = recentMonthTotals(expenses, "2026-10");
    expect(series).toHaveLength(6);
    expect(series.at(-1)).toEqual({ month: "2026-10", total: 350 });
    expect(series.at(-2)).toEqual({ month: "2026-09", total: 240 });
    expect(series[0].total).toBe(0);
    expect(hasFee(expenses, "2026-10", "Aula")).toBe(true);
    expect(hasFee(expenses, "2026-10", "Clube")).toBe(true);
    expect(hasFee(expenses, "2026-08", "Aula")).toBe(false);
  });
});

describe("replacement intervals", () => {
  it("returns the average days between changes and the latest gap source", () => {
    expect(averageIntervalDays(["2026-01-01T15:00:00.000Z"])).toBeNull();
    expect(
      averageIntervalDays([
        "2026-01-31T15:00:00.000Z",
        "2026-01-01T15:00:00.000Z",
        "2026-01-11T15:00:00.000Z",
      ]),
    ).toBe(15);
    expect(averageIntervalDays(["2026-03-01", "2026-03-08", "2026-03-15"])).toBe(7);
  });
});
