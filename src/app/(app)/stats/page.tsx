import type { Metadata } from "next";
import Link from "next/link";
import { RangeTabs } from "@/components/range-tabs";
import { DailyChart, type DailyChartPoint } from "@/features/grind/components/daily-chart";
import {
  GroupTotalsTable,
  type TotalsRow,
} from "@/features/grind/components/group-totals-table";
import { StatTiles } from "@/features/grind/components/stat-tiles";
import { listCharacters, listSessions, type GrindSession } from "@/features/grind/queries";
import { dayKey, formatDayKey, formatInteger, formatSigned } from "@/lib/format";
import { bestExpPerHour, groupTotals, isReliableDuration, perHour } from "@/lib/grind-math";
import { getRequestTime } from "@/lib/request-time";
import { getActiveCharacterId, getTimeZone } from "@/lib/request-preferences";
import {
  DEFAULT_SESSION_RANGE,
  filterByRange,
  hrefWithParams,
  parseSessionRange,
} from "@/lib/session-range";

export const metadata: Metadata = { title: "Estatísticas" };

const VIEWS = [
  { key: "days", label: "Por dia", heading: "Data" },
  { key: "monsters", label: "Por monstro", heading: "Monstro" },
  { key: "maps", label: "Por mapa", heading: "Mapa" },
] as const;

type StatsView = (typeof VIEWS)[number];

function rowsByDay(sessions: GrindSession[], timeZone: string): TotalsRow[] {
  return groupTotals(sessions, (session) => dayKey(session.startedAt, timeZone)).map((group) => ({
    label: formatDayKey(group.key),
    totals: group.totals,
  }));
}

const MAX_CHART_DAYS = 30;

/** Net profit and EXP/h of each of the latest days with sessions, oldest first. */
function dailyChartPoints(sessions: GrindSession[], timeZone: string) {
  const days = groupTotals(sessions, (session) => dayKey(session.startedAt, timeZone))
    .sort((first, second) => first.key.localeCompare(second.key))
    .slice(-MAX_CHART_DAYS);
  const profit: DailyChartPoint[] = days.map((day) => ({
    label: formatDayKey(day.key),
    value: day.totals.profit,
    valueText: formatSigned(day.totals.profit),
  }));
  const reliableDays = days.filter((day) => isReliableDuration(day.totals.activeMs));
  const expRate: DailyChartPoint[] = reliableDays.map((day) => {
    const rate = perHour(day.totals.exp, day.totals.activeMs) ?? 0;
    return { label: formatDayKey(day.key), value: rate, valueText: formatInteger(rate) || "0" };
  });
  return { profit, expRate };
}

/** Groups by a free-text field, best profit per hour first. */
function rowsByPlace(
  sessions: GrindSession[],
  placeOf: (session: GrindSession) => string,
  unnamedLabel: string,
): TotalsRow[] {
  const profitPerHour = (row: TotalsRow) => perHour(row.totals.profit, row.totals.activeMs) ?? 0;
  return groupTotals(sessions, (session) => placeOf(session) || unnamedLabel)
    .map((group) => ({
      label: group.key,
      totals: group.totals,
      bestExpPerHour: bestExpPerHour(group.sessions),
    }))
    .sort((first, second) => profitPerHour(second) - profitPerHour(first));
}

function buildRows(view: StatsView, sessions: GrindSession[], timeZone: string): TotalsRow[] {
  if (view.key === "monsters") {
    return rowsByPlace(sessions, (session) => session.monster, "(sem monstro)");
  }
  if (view.key === "maps") return rowsByPlace(sessions, (session) => session.map, "(sem mapa)");
  return rowsByDay(sessions, timeZone);
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; range?: string }>;
}) {
  const query = await searchParams;
  const view = VIEWS.find((candidate) => candidate.key === query.view) ?? VIEWS[0];
  const range = parseSessionRange(query.range);
  const characters = await listCharacters();
  const [timeZone, activeCharacterId] = await Promise.all([
    getTimeZone(),
    getActiveCharacterId(characters),
  ]);
  const now = getRequestTime();
  const sessions = filterByRange(await listSessions(activeCharacterId), range, now);
  const rows = buildRows(view, sessions, timeZone);
  const charts = dailyChartPoints(sessions, timeZone);
  const rangeParam = range === DEFAULT_SESSION_RANGE ? null : range;
  const viewParam = (candidate: StatsView) => (candidate === VIEWS[0] ? null : candidate.key);

  return (
    <div className="space-y-5">
      <StatTiles sessions={sessions} now={now} timeZone={timeZone} />
      {/* A single day is a number, not a trend; the tiles already show it. */}
      {charts.profit.length >= 2 && charts.expRate.length >= 2 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <DailyChart
            title="Lucro líquido por dia"
            points={charts.profit}
            barClassName="bg-chart-profit"
          />
          <DailyChart title="EXP/h por dia" points={charts.expRate} barClassName="bg-chart-exp" />
        </div>
      ) : null}
      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Agrupamento" className="flex gap-1">
            {VIEWS.map((candidate) => (
              <Link
                key={candidate.key}
                href={hrefWithParams("/stats", { view: viewParam(candidate), range: rangeParam })}
                aria-current={candidate === view ? "page" : undefined}
                className="tab"
              >
                {candidate.label}
              </Link>
            ))}
          </nav>
          <RangeTabs pathname="/stats" current={range} otherParams={{ view: viewParam(view) }} />
        </div>
        {rows.length === 0 ? (
          <p className="px-2.5 py-8 text-center text-muted">Nenhuma sessão neste período.</p>
        ) : (
          <GroupTotalsTable heading={view.heading} rows={rows} showsRecord={view.key !== "days"} />
        )}
      </section>
    </div>
  );
}
