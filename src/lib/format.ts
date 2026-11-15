const integerFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatInteger(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  return integerFormat.format(Math.round(value));
}

export function formatSigned(value: number): string {
  return (value > 0 ? "+" : "") + formatInteger(value);
}

export function formatPercent(value: number | null): string {
  return value === null ? "" : `${percentFormat.format(value)}%`;
}

export function parseInteger(text: string): number | null {
  const digits = text.replace(/[^\d-]/g, "");
  if (digits === "" || digits === "-") return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

const SHORTHAND_PATTERN = /^(\d+)(?:([.,])(\d+))?\s*([km])$/;

/**
 * Parses an amount typed by hand: plain or pt-BR formatted integers, plus the
 * "350k" / "1,2m" shorthand players use for mesos.
 */
export function parseAmount(text: string): number | null {
  const match = text.trim().toLowerCase().match(SHORTHAND_PATTERN);
  if (!match) return parseInteger(text);
  const [, whole, separator, fraction = "", suffix] = match;
  const multiplier = suffix === "k" ? 1_000 : 1_000_000;
  // "1.500k" uses the dot as a pt-BR thousands separator; "1.5m" uses it as a decimal point.
  const isThousandsSeparator = separator === "." && fraction.length === 3;
  const value = isThousandsSeparator ? Number(whole + fraction) : Number(`${whole}.${fraction || "0"}`);
  return Math.round(value * multiplier);
}

const COMPACT_UNITS = [
  { threshold: 999_500_000, divisor: 1_000_000_000, suffix: "B" },
  { threshold: 999_500, divisor: 1_000_000, suffix: "M" },
  { threshold: 10_000, divisor: 1_000, suffix: "k" },
];

/** Short form for large values ("1,24M", "350k"); exact below 10.000. */
export function formatCompact(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  const magnitude = Math.abs(value);
  const unit = COMPACT_UNITS.find((candidate) => magnitude >= candidate.threshold);
  if (!unit) return formatInteger(value);
  const scaled = value / unit.divisor;
  const maximumFractionDigits = Math.abs(scaled) < 10 ? 2 : Math.abs(scaled) < 100 ? 1 : 0;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(scaled) + unit.suffix;
}

export function formatSignedCompact(value: number): string {
  return (value > 0 ? "+" : "") + formatCompact(value);
}

const pad = (value: number) => String(value).padStart(2, "0");

export function formatClock(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
}

export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}min`;
}

type ZonedParts = { year: string; month: string; day: string; hour: string; minute: string };

function zonedParts(timestamp: number, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
  };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    // Intl throws RangeError for unknown zones; that is the only signal it gives.
    return false;
  }
}

/** Sortable calendar day (YYYY-MM-DD) of a timestamp in the given time zone. */
export function dayKey(timestamp: number, timeZone: string): string {
  const { year, month, day } = zonedParts(timestamp, timeZone);
  return `${year}-${month}-${day}`;
}

export function formatDayKey(key: string): string {
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

export function formatTime(timestamp: number, timeZone: string): string {
  const { hour, minute } = zonedParts(timestamp, timeZone);
  return `${hour}:${minute}`;
}

/** Value for an `<input type="datetime-local">`, in the given time zone. */
export function toDateTimeLocal(timestamp: number, timeZone: string): string {
  const { hour, minute } = zonedParts(timestamp, timeZone);
  return `${dayKey(timestamp, timeZone)}T${hour}:${minute}`;
}
