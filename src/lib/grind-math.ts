import { expGained, type ExpProgress } from "./exp-table";

const MS_PER_HOUR = 3_600_000;

export type SessionMetrics = ExpProgress & {
  activeMs: number;
  mesosStart: number;
  mesosEnd: number;
};

export type GrindTimer = {
  startedAt: number;
  pausedMs: number;
  pauseStartedAt: number | null;
};

export type Totals = {
  sessionCount: number;
  activeMs: number;
  profit: number;
  exp: number;
};

export function mesosProfit(session: SessionMetrics): number {
  return session.mesosEnd - session.mesosStart;
}

export function perHour(value: number | null, ms: number): number | null {
  if (value === null || ms <= 0) return null;
  return value / (ms / MS_PER_HOUR);
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
    totals.profit += mesosProfit(session);
    totals.exp += expGained(session) ?? 0;
  }
  return totals;
}

export function groupTotals<T extends SessionMetrics>(
  sessions: T[],
  keyOf: (session: T) => string,
): { key: string; totals: Totals }[] {
  const groups = new Map<string, T[]>();
  for (const session of sessions) {
    const key = keyOf(session);
    const group = groups.get(key);
    if (group) group.push(session);
    else groups.set(key, [session]);
  }
  return [...groups].map(([key, group]) => ({ key, totals: aggregate(group) }));
}
