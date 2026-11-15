const MS_PER_DAY = 86_400_000;

export const SESSION_RANGES = [
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
  { key: "all", label: "Tudo", days: null },
] as const;

export type SessionRangeKey = (typeof SESSION_RANGES)[number]["key"];

export const DEFAULT_SESSION_RANGE: SessionRangeKey = "all";

export function parseSessionRange(value: string | undefined): SessionRangeKey {
  return SESSION_RANGES.find((range) => range.key === value)?.key ?? DEFAULT_SESSION_RANGE;
}

export function filterByRange<T extends { startedAt: number }>(
  sessions: T[],
  rangeKey: SessionRangeKey,
  now: number,
): T[] {
  const days = SESSION_RANGES.find((range) => range.key === rangeKey)?.days ?? null;
  if (days === null) return sessions;
  const earliest = now - days * MS_PER_DAY;
  return sessions.filter((session) => session.startedAt >= earliest);
}

/** Builds a link that keeps only the query parameters that differ from their defaults. */
export function hrefWithParams(pathname: string, params: Record<string, string | null>): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value) query.set(name, value);
  }
  const queryString = query.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}
