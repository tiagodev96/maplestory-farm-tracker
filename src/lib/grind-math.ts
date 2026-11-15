import { expGained, expToNextLevel, type ExpProgress } from "./exp-table";

const MS_PER_HOUR = 3_600_000;
// Shorter sessions give rates too noisy to count as a record or to project from.
const MIN_RELIABLE_SESSION_MS = 10 * 60_000;

export type SessionMetrics = ExpProgress & {
  activeMs: number;
  mesosStart: number;
  mesosEnd: number;
  /** Consumables used up during the session, in mesos. */
  suppliesCost: number;
  /** Market value of the items dropped during the session, in mesos. */
  dropsValue: number;
};

export type GrindTimer = {
  startedAt: number;
  pausedMs: number;
  pauseStartedAt: number | null;
};

export type Totals = {
  sessionCount: number;
  activeMs: number;
  /** Net profit: mesos gained plus drops, minus supplies. */
  profit: number;
  exp: number;
};

export function mesosGained(session: SessionMetrics): number {
  return session.mesosEnd - session.mesosStart;
}

export function netProfit(session: SessionMetrics): number {
  return mesosGained(session) + session.dropsValue - session.suppliesCost;
}

export function perHour(value: number | null, ms: number): number | null {
  if (value === null || ms <= 0) return null;
  return value / (ms / MS_PER_HOUR);
}

/** Whether an amount of grind time is long enough for a per-hour rate to mean something. */
export function isReliableDuration(activeMs: number): boolean {
  return activeMs >= MIN_RELIABLE_SESSION_MS;
}

export function hasReliableRates(session: SessionMetrics): boolean {
  return isReliableDuration(session.activeMs);
}

export function expPerHour(session: SessionMetrics): number | null {
  return perHour(expGained(session), session.activeMs);
}

export function elapsedActiveMs(timer: GrindTimer, now: number): number {
  const countedUntil = timer.pauseStartedAt ?? now;
  return Math.max(0, countedUntil - timer.startedAt - timer.pausedMs);
}

export function totalPausedMs(timer: GrindTimer, now: number): number {
  const currentPause = timer.pauseStartedAt === null ? 0 : now - timer.pauseStartedAt;
  return timer.pausedMs + Math.max(0, currentPause);
}

export function aggregate(sessions: SessionMetrics[]): Totals {
  const totals: Totals = { sessionCount: sessions.length, activeMs: 0, profit: 0, exp: 0 };
  for (const session of sessions) {
    totals.activeMs += session.activeMs;
    totals.profit += netProfit(session);
    totals.exp += expGained(session) ?? 0;
  }
  return totals;
}

export function groupTotals<T extends SessionMetrics>(
  sessions: T[],
  keyOf: (session: T) => string,
): { key: string; totals: Totals; sessions: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const session of sessions) {
    const key = keyOf(session);
    const group = groups.get(key);
    if (group) group.push(session);
    else groups.set(key, [session]);
  }
  return [...groups].map(([key, group]) => ({ key, totals: aggregate(group), sessions: group }));
}

/** Time left to reach the next level at the given pace, or null when it cannot be estimated. */
export function timeToNextLevelMs(
  level: number,
  exp: number,
  expRatePerHour: number | null,
): number | null {
  const needed = expToNextLevel(level);
  if (needed === null || expRatePerHour === null || expRatePerHour <= 0) return null;
  return (Math.max(0, needed - exp) / expRatePerHour) * MS_PER_HOUR;
}

/** Highest EXP/h among sessions long enough to be meaningful. */
export function bestExpPerHour(sessions: SessionMetrics[]): number | null {
  const rates = sessions
    .filter(hasReliableRates)
    .map(expPerHour)
    .filter((rate): rate is number => rate !== null);
  return rates.length > 0 ? Math.max(...rates) : null;
}

/**
 * Ids of the sessions holding the EXP/h record of their group. A group needs at
 * least two eligible sessions, otherwise every first visit would be a "record".
 */
export function recordSessionIds<T extends SessionMetrics & { id: string }>(
  sessions: T[],
  keyOf: (session: T) => string,
): Set<string> {
  const records = new Set<string>();
  for (const group of groupTotals(sessions, keyOf)) {
    const eligible = group.sessions.filter(hasReliableRates);
    if (eligible.length < 2) continue;
    const best = eligible.reduce((leader, session) =>
      (expPerHour(session) ?? 0) > (expPerHour(leader) ?? 0) ? session : leader,
    );
    records.add(best.id);
  }
  return records;
}
