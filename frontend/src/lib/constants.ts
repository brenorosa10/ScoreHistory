export const HANDEDNESS_OPTIONS = ["Destro", "Canhoto"] as const;
export const COURT_TYPE_OPTIONS = ["Saibro", "Rápida", "Grama"] as const;

export type Handedness = (typeof HANDEDNESS_OPTIONS)[number];
export type CourtType = (typeof COURT_TYPE_OPTIONS)[number];
