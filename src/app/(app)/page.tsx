import Link from "next/link";
import { LevelBar } from "@/components/level-bar";
import { ActiveGrindCard } from "@/features/grind/components/active-grind-card";
import { CreateCharacterForm } from "@/features/grind/components/create-character-form";
import { SessionList } from "@/features/grind/components/session-list";
import {
  StartGrindForm,
  type LastSessionEnd,
} from "@/features/grind/components/start-grind-form";
import { StatTiles } from "@/features/grind/components/stat-tiles";
import {
  getActiveGrind,
  listCharacters,
  listKnownItems,
  listKnownMaps,
  listKnownMonsters,
  listSessions,
  type GrindSession,
} from "@/features/grind/queries";
import { formatDuration, formatInteger } from "@/lib/format";
import {
  expPerHour,
  hasReliableRates,
  recordSessionIds,
  timeToNextLevelMs,
} from "@/lib/grind-math";
import { getRequestTime } from "@/lib/request-time";
import { getActiveCharacterId, getTimeZone } from "@/lib/request-preferences";

const RECENT_SESSION_COUNT = 5;

function lastSessionEndByCharacter(newestFirst: GrindSession[]): Record<string, LastSessionEnd> {
  const lastEnds: Record<string, LastSessionEnd> = {};
  for (const session of newestFirst) {
    lastEnds[session.characterId] ??= {
      monster: session.monster,
      map: session.map,
      isParty: session.isParty,
      mesosEnd: session.mesosEnd,
      levelEnd: session.levelEnd,
      expEnd: session.expEnd,
    };
  }
  return lastEnds;
}

export default async function GrindPage() {
  const characters = await listCharacters();

  if (characters.length === 0) {
    return (
      <section className="card mx-auto max-w-md space-y-4">
        <h1 className="text-lg font-bold">Crie seu primeiro personagem</h1>
        <p className="text-sm text-muted">
          Cada sessão de grind pertence a um personagem. Você pode adicionar outros depois.
        </p>
        <CreateCharacterForm />
      </section>
    );
  }

  const [activeGrind, allSessions, knownMonsters, knownMaps, knownItems, timeZone, activeCharacterId] =
    await Promise.all([
      getActiveGrind(),
      listSessions(null),
      listKnownMonsters(),
      listKnownMaps(),
      listKnownItems(),
      getTimeZone(),
      getActiveCharacterId(characters),
    ]);
  const now = getRequestTime();
  const filteredSessions = activeCharacterId
    ? allSessions.filter((session) => session.characterId === activeCharacterId)
    : allSessions;
  const defaultCharacterId = activeCharacterId ?? allSessions[0]?.characterId ?? characters[0].id;
  const latestSession = filteredSessions[0];
  // The pace comes from the character's latest session long enough to be trusted.
  const paceSession = latestSession
    ? filteredSessions.find(
        (session) =>
          session.characterId === latestSession.characterId && hasReliableRates(session),
      )
    : undefined;
  const timeToLevelMs =
    latestSession && paceSession
      ? timeToNextLevelMs(latestSession.levelEnd, latestSession.expEnd, expPerHour(paceSession))
      : null;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(340px,420px)_1fr]">
      <section className="card" aria-live="polite">
        {activeGrind ? (
          <ActiveGrindCard
            grind={activeGrind}
            serverNow={now}
            timeZone={timeZone}
            knownItems={knownItems}
          />
        ) : (
          <StartGrindForm
            characters={characters}
            defaultCharacterId={defaultCharacterId}
            lastSessionEndByCharacter={lastSessionEndByCharacter(allSessions)}
            knownMonsters={knownMonsters}
            knownMaps={knownMaps}
          />
        )}
      </section>

      <div className="min-w-0 space-y-4">
        {latestSession ? (
          <section className="card flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {latestSession.characterName}
              </h2>
              <p className="text-lg font-bold tabular-nums text-accent">
                {formatInteger(latestSession.mesosEnd)}
                <span className="ml-1.5 text-xs font-normal text-muted">mesos</span>
              </p>
            </div>
            <div className="min-w-[180px] flex-1">
              <LevelBar level={latestSession.levelEnd} exp={latestSession.expEnd} />
              {timeToLevelMs !== null ? (
                <p className="mt-1.5 text-xs text-muted">
                  Cerca de <b className="font-semibold text-text">{formatDuration(timeToLevelMs)}</b>{" "}
                  para o Lv {latestSession.levelEnd + 1} no seu ritmo mais recente.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <StatTiles sessions={filteredSessions} now={now} timeZone={timeZone} />

        <section className="card">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="section-title mb-0">Últimas sessões</h2>
            {filteredSessions.length > RECENT_SESSION_COUNT ? (
              <Link href="/history" className="text-sm text-accent hover:underline">
                Ver todas ({filteredSessions.length})
              </Link>
            ) : null}
          </div>
          {filteredSessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nenhuma sessão ainda. Preencha os valores e inicie seu primeiro grind.
            </p>
          ) : (
            <SessionList
              sessions={filteredSessions.slice(0, RECENT_SESSION_COUNT)}
              timeZone={timeZone}
              recordIds={recordSessionIds(filteredSessions, (session) => session.monster)}
            />
          )}
        </section>
      </div>
    </div>
  );
}
