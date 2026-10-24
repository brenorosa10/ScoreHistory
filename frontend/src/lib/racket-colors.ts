import { racketHasStrings } from "@/lib/racket-sport";

export type ColorSlot = "frame" | "detail" | "grip";

export const COLOR_SLOTS: readonly ColorSlot[] = ["frame", "detail", "grip"];

/** Common frame, string-bed/face, and grip colors seen on court. */
export const SLOT_SWATCHES: Record<ColorSlot, readonly string[]> = {
  frame: ["#1f2937", "#f4f4f5", "#b91c1c", "#1e3a8a", "#166534", "#ca8a04", "#ea580c", "#0f766e", "#9f1239", "#64748b"],
  detail: ["#e5e7eb", "#fde047", "#111827", "#22d3ee", "#fb7185", "#a3e635", "#60a5fa", "#f8fafc"],
  grip: ["#44403c", "#1c1917", "#f5f5f4", "#7f1d1d", "#1e3a5f", "#a16207", "#14532d", "#334155"],
};

export function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return null;
  }
  return trimmed.toLowerCase();
}

export function swatchMatches(swatch: string, value: string): boolean {
  const left = normalizeHexColor(swatch);
  const right = normalizeHexColor(value);
  return left != null && left === right;
}

export function isPaletteColor(slot: ColorSlot, value: string): boolean {
  return SLOT_SWATCHES[slot].some((swatch) => swatchMatches(swatch, value));
}

export function slotLabel(slot: ColorSlot): string {
  if (slot === "frame") {
    return "Cabeça / aro";
  }
  if (slot === "grip") {
    return "Cabo";
  }
  return "Detalhes";
}

export function slotHint(slot: ColorSlot, sport: string | null | undefined): string {
  if (slot === "frame") {
    return "Aro e estrutura";
  }
  if (slot === "grip") {
    return "Empunhadura";
  }
  return racketHasStrings(sport) ? "Leito das cordas" : "Face e furos";
}
