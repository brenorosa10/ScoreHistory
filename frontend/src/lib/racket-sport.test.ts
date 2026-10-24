import { describe, expect, it } from "vitest";
import { isPaletteColor, normalizeHexColor, slotHint, slotLabel, swatchMatches } from "@/lib/racket-colors";
import { normalizeRacketSport, racketHasStrings, serviceKindsForSport } from "@/lib/racket-sport";

describe("racket sport", () => {
  it("treats missing and unknown values as tênis", () => {
    expect(normalizeRacketSport(undefined)).toBe("Tênis");
    expect(normalizeRacketSport("")).toBe("Tênis");
    expect(normalizeRacketSport("squash")).toBe("Tênis");
    expect(racketHasStrings("Tênis")).toBe(true);
    expect(racketHasStrings(null)).toBe(true);
  });

  it("hides corda for padel and beach tennis", () => {
    expect(racketHasStrings("Padel")).toBe(false);
    expect(racketHasStrings("Beach tennis")).toBe(false);
    expect(serviceKindsForSport("Padel")).toEqual(["Overgrip", "Grip", "Outro"]);
    expect(serviceKindsForSport("Beach tennis")).not.toContain("Corda");
    expect(serviceKindsForSport("Tênis")).toContain("Corda");
  });
});

describe("racket color palette", () => {
  it("normalizes hex and matches swatches case-insensitively", () => {
    expect(normalizeHexColor(" #1F2937 ")).toBe("#1f2937");
    expect(normalizeHexColor("blue")).toBeNull();
    expect(normalizeHexColor("#fff")).toBeNull();
    expect(swatchMatches("#E5E7EB", "#e5e7eb")).toBe(true);
    expect(isPaletteColor("frame", "#1F2937")).toBe(true);
    expect(isPaletteColor("grip", "#ff00aa")).toBe(false);
  });

  it("labels each slot and explains what it paints", () => {
    expect(slotLabel("frame")).toBe("Cabeça / aro");
    expect(slotLabel("detail")).toBe("Detalhes");
    expect(slotLabel("grip")).toBe("Cabo");
    expect(slotHint("detail", "Tênis")).toBe("Leito das cordas");
    expect(slotHint("detail", "Padel")).toBe("Face e furos");
    expect(slotHint("detail", "Beach tennis")).toBe("Face e furos");
  });
});
