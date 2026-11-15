import type { Metadata } from "next";
import Link from "next/link";
import { RangeTabs } from "@/components/range-tabs";
import { SessionList } from "@/features/grind/components/session-list";
import { SessionsTable } from "@/features/grind/components/sessions-table";
import { listCharacters, listSessions } from "@/features/grind/queries";
import { getRequestTime } from "@/lib/request-time";
import { getActiveCharacterId, getTimeZone } from "@/lib/request-preferences";
import { filterByRange, parseSessionRange } from "@/lib/session-range";

export const metadata: Metadata = { title: "Histórico" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const range = parseSessionRange((await searchParams).range);
  const characters = await listCharacters();
  const [timeZone, activeCharacterId] = await Promise.all([
    getTimeZone(),
    getActiveCharacterId(characters),
  ]);
  const sessions = filterByRange(await listSessions(activeCharacterId), range, getRequestTime());

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="section-title mb-0">Sessões</h1>
        <RangeTabs pathname="/history" current={range} />
        {characters.length > 0 ? (
          <Link href="/history/new" className="btn btn-small ml-auto">
            + Sessão manual
          </Link>
        ) : null}
      </div>
      {sessions.length === 0 ? (
        <p className="px-2.5 py-8 text-center text-muted">
          Nenhuma sessão neste período.{" "}
          <Link href="/" className="text-accent hover:underline">
            Iniciar um grind
          </Link>
        </p>
      ) : (
        <>
          <div className="hidden md:block">
            <SessionsTable sessions={sessions} timeZone={timeZone} />
          </div>
          <div className="md:hidden">
            <SessionList sessions={sessions} timeZone={timeZone} />
          </div>
        </>
      )}
    </section>
  );
}
