const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export function formatShortDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatFullDate(value: string): string {
  return fullDateFormatter.format(new Date(value));
}

export function formatMonth(value: string): string {
  const label = monthFormatter.format(new Date(value));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function daysSince(value: string): number {
  const diff = startOfDay(new Date()) - startOfDay(new Date(value));
  return Math.max(0, Math.round(diff / 86_400_000));
}

export function formatRelativeDays(value: string): string {
  const days = daysSince(value);

  if (days === 0) {
    return "hoje";
  }
  if (days === 1) {
    return "ontem";
  }
  if (days < 30) {
    return `há ${days} dias`;
  }

  const months = Math.round(days / 30);
  if (months < 12) {
    return months === 1 ? "há 1 mês" : `há ${months} meses`;
  }

  const years = Math.floor(months / 12);
  return years === 1 ? "há 1 ano" : `há ${years} anos`;
}

export function toInitials(value: string): string {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

export function opponentMeta(handedness: string, playingClass?: string | null): string {
  return [handedness, playingClass].filter(Boolean).join(" · ");
}

const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatMoney(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }
  return moneyFormatter.format(value);
}

export function moneyToInput(value: number | null | undefined): string {
  if (value == null) {
    return "";
  }
  return String(value).replace(".", ",");
}

export function parseMoney(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
}

export function todayInputValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const offset = new Date(value).getTimezoneOffset() * 60_000;
  return new Date(new Date(value).getTime() - offset).toISOString().slice(0, 10);
}

export function dateInputToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return new Date(`${trimmed}T12:00:00`).toISOString();
}
