import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LevelBar } from "@/components/level-bar";
import { TimeZoneSync } from "@/components/time-zone-sync";
import {
  GroupTotalsTable,
  type TotalsRow,
} from "@/features/grind/components/group-totals-table";
import { SessionList } from "@/features/grind/components/session-list";
import { StatTiles } from "@/features/grind/components/stat-tiles";
import { getPublicCharacter } from "@/features/grind/queries";
import { formatInteger } from "@/lib/format";
import { bestExpPerHour, groupTotals, recordSessionIds } from "@/lib/grind-math";
import { getRequestTime } from "@/lib/request-time";
import { getReportedTimeZone, FALLBACK_TIME_ZONE, TIME_ZONE_COOKIE } from "@/lib/request-preferences";

const RECENT_SESSION_COUNT = 20;
const SLUG_PATTERN = /^[0-9a-f]{32}$/;

// Shared by link only: search engines should not list these pages.
export const metadata: Metadata = { title: "Perfil público", robots: { index: false } };

export default async function PublicCharacterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();
  const character = await getPublicCharacter(slug);
  if (!character) notFound();

  const reportedTimeZone = await getReportedTimeZone();
  const timeZone = reportedTimeZone ?? FALLBACK_TIME_ZONE;
  const { sessions } = character;
  const latestSession = sessions[0];
  const monsterRows: TotalsRow[] = groupTotals(sessions, (session) => session.monster || "(sem monstro)")
    .map((group) => ({
      label: group.key,
      totals: group.totals,
      bestExpPerHour: bestExpPerHour(group.sessions),
    }))
    .sort((first, second) => second.totals.exp - first.totals.exp);

  return (
    <main className="mx-auto max-w-[900px] space-y-5 px-4 py-6">
      <TimeZoneSync cookieName={TIME_ZONE_COOKIE} reportedTimeZone={reportedTimeZone} />
      <header className="card flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            <span className="text-accent">Farm Tracker</span> · perfil público
          </p>
          <h1 className="text-2xl font-bold">{character.name}</h1>
          {latestSession ? (
            <p className="text-sm tabular-nums text-muted">
              {formatInteger(latestSession.mesosEnd)} mesos
            </p>
          ) : null}
        </div>
        {latestSession ? (
          <div className="min-w-[200px] flex-1">
            <LevelBar level={latestSession.levelEnd} exp={latestSession.expEnd} />
          </div>
        ) : null}
      </header>

      {sessions.length === 0 ? (
        <p className="card text-center text-muted">Este personagem ainda não tem sessões.</p>
      ) : (
        <>
          <StatTiles sessions={sessions} now={getRequestTime()} timeZone={timeZone} />
          <section className="card">
            <h2 className="section-title">Por monstro</h2>
            <GroupTotalsTable heading="Monstro" rows={monsterRows} showsRecord />
          </section>
          <section className="card">
            <h2 className="section-title mb-1">Últimas sessões</h2>
            <SessionList
              sessions={sessions.slice(0, RECENT_SESSION_COUNT)}
              timeZone={timeZone}
              recordIds={recordSessionIds(sessions, (session) => session.monster)}
              isReadOnly
            />
          </section>
        </>
      )}
    </main>
  );
}
