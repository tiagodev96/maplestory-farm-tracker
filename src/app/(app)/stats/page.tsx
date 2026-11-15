import type { Metadata } from "next";
import Link from "next/link";
import { RangeTabs } from "@/components/range-tabs";
import {
  GroupTotalsTable,
  type TotalsRow,
} from "@/features/grind/components/group-totals-table";
import { StatTiles } from "@/features/grind/components/stat-tiles";
import { listCharacters, listSessions, type GrindSession } from "@/features/grind/queries";
import { dayKey, formatDayKey } from "@/lib/format";
import { groupTotals, perHour } from "@/lib/grind-math";
import { getRequestTime } from "@/lib/request-time";
import { getActiveCharacterId, getTimeZone } from "@/lib/request-preferences";
import {
  DEFAULT_SESSION_RANGE,
  filterByRange,
  hrefWithParams,
  parseSessionRange,
} from "@/lib/session-range";

export const metadata: Metadata = { title: "Estatísticas" };

const UNNAMED_MONSTER = "(sem monstro)";

type StatsView = "days" | "monsters";

function rowsByDay(sessions: GrindSession[], timeZone: string): TotalsRow[] {
  return groupTotals(sessions, (session) => dayKey(session.startedAt, timeZone)).map((group) => ({
    label: formatDayKey(group.key),
    totals: group.totals,
  }));
}

function rowsByMonster(sessions: GrindSession[]): TotalsRow[] {
  const profitPerHour = (row: TotalsRow) => perHour(row.totals.profit, row.totals.activeMs) ?? 0;
  return groupTotals(sessions, (session) => session.monster || UNNAMED_MONSTER)
    .map((group) => ({ label: group.key, totals: group.totals }))
    .sort((first, second) => profitPerHour(second) - profitPerHour(first));
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; range?: string }>;
}) {
  const query = await searchParams;
  const view: StatsView = query.view === "monsters" ? "monsters" : "days";
  const range = parseSessionRange(query.range);
  const characters = await listCharacters();
  const [timeZone, activeCharacterId] = await Promise.all([
    getTimeZone(),
    getActiveCharacterId(characters),
  ]);
  const now = getRequestTime();
  const sessions = filterByRange(await listSessions(activeCharacterId), range, now);
  const rows = view === "days" ? rowsByDay(sessions, timeZone) : rowsByMonster(sessions);
  const rangeParam = range === DEFAULT_SESSION_RANGE ? null : range;

  return (
    <div className="space-y-5">
      <StatTiles sessions={sessions} now={now} timeZone={timeZone} />
      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Agrupamento" className="flex gap-1">
            <Link
              href={hrefWithParams("/stats", { range: rangeParam })}
              aria-current={view === "days" ? "page" : undefined}
              className="tab"
            >
              Por dia
            </Link>
            <Link
              href={hrefWithParams("/stats", { view: "monsters", range: rangeParam })}
              aria-current={view === "monsters" ? "page" : undefined}
              className="tab"
            >
              Por monstro
            </Link>
          </nav>
          <RangeTabs
            pathname="/stats"
            current={range}
            otherParams={{ view: view === "monsters" ? "monsters" : null }}
          />
        </div>
        {rows.length === 0 ? (
          <p className="px-2.5 py-8 text-center text-muted">Nenhuma sessão neste período.</p>
        ) : (
          <GroupTotalsTable heading={view === "days" ? "Data" : "Monstro"} rows={rows} />
        )}
      </section>
    </div>
  );
}
