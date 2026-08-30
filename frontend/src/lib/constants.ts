export const HANDEDNESS_OPTIONS = ["Destro", "Canhoto"] as const;
export const COURT_TYPE_OPTIONS = ["Saibro", "Rápida", "Grama"] as const;
export const OPPONENT_CLASS_OPTIONS = [
  "1ª classe",
  "2ª classe",
  "3ª classe",
  "4ª classe",
  "5ª classe",
  "6ª classe",
  "40B",
  "40A",
  "50A",
  "50B",
] as const;

export type Handedness = (typeof HANDEDNESS_OPTIONS)[number];
export type CourtType = (typeof COURT_TYPE_OPTIONS)[number];
export type OpponentClass = (typeof OPPONENT_CLASS_OPTIONS)[number];
