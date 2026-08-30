export function resultLetter(won: boolean | null): "V" | "D" | "E" {
  if (won === true) {
    return "V";
  }
  if (won === false) {
    return "D";
  }
  return "E";
}

export function resultLabel(won: boolean | null): string {
  if (won === true) {
    return "Vitória";
  }
  if (won === false) {
    return "Derrota";
  }
  return "Empate";
}

export function resultBadgeClass(won: boolean | null): string {
  if (won === true) {
    return "bg-success/12 text-success";
  }
  if (won === false) {
    return "bg-destructive/12 text-destructive";
  }
  return "bg-warning/15 text-warning";
}

export function resultBannerClass(won: boolean | null): string {
  if (won === true) {
    return "bg-success text-white";
  }
  if (won === false) {
    return "bg-destructive text-white";
  }
  return "bg-warning text-foreground";
}
