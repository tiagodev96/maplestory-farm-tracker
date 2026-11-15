import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SessionForm } from "@/features/grind/components/session-form";
import {
  listCharacters,
  listKnownItems,
  listKnownMaps,
  listKnownMonsters,
  listSessions,
} from "@/features/grind/queries";
import { getRequestTime } from "@/lib/request-time";
import { getActiveCharacterId, getTimeZone } from "@/lib/request-preferences";

export const metadata: Metadata = { title: "Sessão manual" };

const ONE_HOUR_MS = 3_600_000;

export default async function NewSessionPage() {
  const characters = await listCharacters();
  if (characters.length === 0) redirect("/");

  const [allSessions, knownMonsters, knownMaps, knownItems, timeZone, activeCharacterId] =
    await Promise.all([
      listSessions(null),
      listKnownMonsters(),
      listKnownMaps(),
      listKnownItems(),
      getTimeZone(),
      getActiveCharacterId(characters),
    ]);
  const characterId = activeCharacterId ?? allSessions[0]?.characterId ?? characters[0].id;
  const lastSession = allSessions.find((session) => session.characterId === characterId);
  const now = getRequestTime();

  return (
    <section className="card mx-auto max-w-xl">
      <h1 className="mb-4 text-lg font-bold">Sessão manual</h1>
      <SessionForm
        key={timeZone}
        characters={characters}
        knownMonsters={knownMonsters}
        knownMaps={knownMaps}
        knownItems={knownItems}
        initialDrops={[]}
        timeZone={timeZone}
        values={{
          id: null,
          characterId,
          monster: lastSession?.monster ?? "",
          map: lastSession?.map ?? "",
          isParty: lastSession?.isParty ?? false,
          startedAt: now - ONE_HOUR_MS,
          endedAt: now,
          activeMs: null,
          mesosStart: lastSession?.mesosEnd ?? null,
          mesosEnd: null,
          levelStart: lastSession?.levelEnd ?? null,
          expStart: lastSession?.expEnd ?? null,
          levelEnd: lastSession?.levelEnd ?? null,
          expEnd: null,
          suppliesCost: null,
          notes: "",
        }}
      />
    </section>
  );
}
