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

const graphemeSegmenter = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

function firstGrapheme(value: string): string {
  const segment = graphemeSegmenter.segment(value)[Symbol.iterator]().next().value?.segment ?? "";
  return segment.toLocaleUpperCase("pt-BR");
}

/** First grapheme of each of the first two words, so emoji names are not split into surrogates. */
export function toInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((part) => firstGrapheme(part)).join("");
  return initials || "?";
}

export function normalizeOpponentName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
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

export function formatCents(cents: number): string {
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${grouped},${String(frac).padStart(2, "0")}`;
}

/** Digits are cents, so typing 2500 or pasting 25,00 both become 25,00. */
export function maskMoneyTyping(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
  if (!digits) {
    return "";
  }
  return formatCents(Number(digits));
}

export function moneyToInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }
  return formatCents(Math.round(value * 100));
}

function centsFromDecimal(normalized: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ""] = normalized.split(".");
  if (whole.length > 10) {
    return null;
  }

  const wholeNumber = Number(whole);
  if (!Number.isSafeInteger(wholeNumber)) {
    return null;
  }

  const padded = `${fraction}000`.slice(0, 3);
  const cents = wholeNumber * 100 + Number(padded.slice(0, 2)) + (padded[2] >= "5" ? 1 : 0);
  return cents;
}

export function parseMoney(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, "").replace(/^r\$/i, "");
  if (!trimmed || !/^[\d.,]+$/.test(trimmed)) {
    return null;
  }

  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");
  let normalized: string;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? trimmed.replace(/\./g, "").replace(",", ".")
        : trimmed.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (lastDot >= 0) {
    const groups = trimmed.split(".");
    const fraction = groups.at(-1) ?? "";
    normalized = groups.length > 2 || fraction.length === 3 ? groups.join("") : trimmed;
  } else {
    normalized = trimmed;
  }

  const cents = centsFromDecimal(normalized);
  return cents == null ? null : cents / 100;
}

export function formatInputDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return fullDateFormatter.format(date);
}

export function dateInputError(
  value: string,
  options?: { required?: boolean; max?: string },
): true | string {
  const trimmed = value.trim();
  if (!trimmed) {
    return options?.required === false ? true : "Informe a data.";
  }

  if (!formatInputDate(trimmed)) {
    return "Informe uma data válida.";
  }

  if (options?.max && trimmed > options.max) {
    const maxLabel = formatInputDate(options.max) ?? options.max;
    return `A data deve ser ${maxLabel} ou anterior.`;
  }

  return true;
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
