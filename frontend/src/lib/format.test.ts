import { describe, expect, it } from "vitest";
import {
  dateInputError,
  maskMoneyTyping,
  moneyToInput,
  normalizeOpponentName,
  parseMoney,
  toInitials,
} from "@/lib/format";

describe("grapheme initials", () => {
  it("does not split an emoji into a lone surrogate", () => {
    expect(toInitials("Ana 🎾")).toBe("A🎾");
    expect(toInitials("🎾 Ana")).toBe("🎾A");
    expect(toInitials("Ana")).toBe("A");
    expect(toInitials("ana silva")).toBe("AS");
    expect(toInitials("   ")).toBe("?");
  });
});

describe("opponent name normalization", () => {
  it("ignores case and extra whitespace", () => {
    expect(normalizeOpponentName("  Ana   Silva ")).toBe(normalizeOpponentName("ana silva"));
  });
});

describe("money parsing", () => {
  it("accepts pt-BR thousands and plain decimals", () => {
    expect(parseMoney("1.200,50")).toBe(1200.5);
    expect(parseMoney("1200,50")).toBe(1200.5);
    expect(parseMoney("R$ 1.200,50")).toBe(1200.5);
    expect(parseMoney("1200.50")).toBe(1200.5);
    expect(parseMoney("1.200")).toBe(1200);
  });

  it("rejects empty and negative values", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("-10")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });

  it("keeps 25,00 as exactly 25.00", () => {
    expect(parseMoney("25,00")).toBe(25);
    expect(parseMoney("25,01")).toBe(25.01);
    expect(parseMoney("0,10")).toBe(0.1);
    expect(moneyToInput(25)).toBe("25,00");
    expect(moneyToInput(parseMoney("25,00"))).toBe("25,00");
  });
});

describe("money mask", () => {
  it("treats typed digits as cents and accepts both thousand formats", () => {
    expect(maskMoneyTyping("25,00")).toBe("25,00");
    expect(maskMoneyTyping("2500")).toBe("25,00");
    expect(maskMoneyTyping("1.200,50")).toBe("1.200,50");
    expect(maskMoneyTyping("1200,50")).toBe("1.200,50");
    expect(maskMoneyTyping("")).toBe("");
    expect(parseMoney(maskMoneyTyping("25,00"))).toBe(25);
    expect(parseMoney(maskMoneyTyping("1.200,50"))).toBe(1200.5);
    expect(parseMoney(maskMoneyTyping("1200,50"))).toBe(1200.5);
  });
});

describe("date validation", () => {
  it("uses a pt-BR message for future dates", () => {
    expect(dateInputError("2026-10-24", { max: "2026-10-23" })).toBe(
      "A data deve ser 23 de outubro de 2026 ou anterior.",
    );
    expect(dateInputError("2026-10-23", { max: "2026-10-23" })).toBe(true);
    expect(dateInputError("", { required: false })).toBe(true);
    expect(dateInputError("")).toBe("Informe a data.");
  });
});
