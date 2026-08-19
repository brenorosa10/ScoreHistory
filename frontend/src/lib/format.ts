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

export function toInitials(value: string): string {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}
