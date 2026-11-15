import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { activeGrinds, characters, grindSessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import type { GrindTimer, SessionMetrics } from "@/lib/grind-math";

export type Character = { id: string; name: string };

export type GrindSession = SessionMetrics & {
  id: string;
  characterId: string;
  characterName: string;
  monster: string;
  startedAt: number;
  endedAt: number;
  notes: string;
};

export type ActiveGrind = GrindTimer & {
  characterName: string;
  monster: string;
  mesosStart: number;
  levelStart: number;
  expStart: number;
};

export async function listCharacters(): Promise<Character[]> {
  const user = await requireUser();
  const db = await getDb();
  return db
    .select({ id: characters.id, name: characters.name })
    .from(characters)
    .where(eq(characters.userId, user.id))
    .orderBy(asc(characters.createdAt));
}

const sessionColumns = {
  id: grindSessions.id,
  characterId: grindSessions.characterId,
  characterName: characters.name,
  monster: grindSessions.monster,
  startedAt: grindSessions.startedAt,
  endedAt: grindSessions.endedAt,
  activeMs: grindSessions.activeMs,
  mesosStart: grindSessions.mesosStart,
  mesosEnd: grindSessions.mesosEnd,
  levelStart: grindSessions.levelStart,
  expStart: grindSessions.expStart,
  levelEnd: grindSessions.levelEnd,
  expEnd: grindSessions.expEnd,
  notes: grindSessions.notes,
};

type SessionRecord = Omit<GrindSession, "startedAt" | "endedAt"> & {
  startedAt: Date;
  endedAt: Date;
};

function toGrindSession(record: SessionRecord): GrindSession {
  return {
    ...record,
    startedAt: record.startedAt.getTime(),
    endedAt: record.endedAt.getTime(),
  };
}

/** Sessions of the signed-in user, newest first, optionally limited to one character. */
export async function listSessions(characterId: string | null): Promise<GrindSession[]> {
  const user = await requireUser();
  const db = await getDb();
  const records = await db
    .select(sessionColumns)
    .from(grindSessions)
    .innerJoin(characters, eq(grindSessions.characterId, characters.id))
    .where(
      and(
        eq(grindSessions.userId, user.id),
        characterId ? eq(grindSessions.characterId, characterId) : undefined,
      ),
    )
    .orderBy(desc(grindSessions.startedAt));
  return records.map(toGrindSession);
}

export async function getSession(sessionId: string): Promise<GrindSession | null> {
  const user = await requireUser();
  const db = await getDb();
  const [record] = await db
    .select(sessionColumns)
    .from(grindSessions)
    .innerJoin(characters, eq(grindSessions.characterId, characters.id))
    .where(and(eq(grindSessions.id, sessionId), eq(grindSessions.userId, user.id)));
  return record ? toGrindSession(record) : null;
}

/** Monster names the user has typed before, for autocomplete. */
export async function listKnownMonsters(): Promise<string[]> {
  const user = await requireUser();
  const db = await getDb();
  const records = await db
    .selectDistinct({ monster: grindSessions.monster })
    .from(grindSessions)
    .where(eq(grindSessions.userId, user.id))
    .orderBy(asc(grindSessions.monster));
  return records.map((record) => record.monster).filter((monster) => monster !== "");
}

export async function getActiveGrind(): Promise<ActiveGrind | null> {
  const user = await requireUser();
  const db = await getDb();
  const [record] = await db
    .select({
      characterName: characters.name,
      monster: activeGrinds.monster,
      startedAt: activeGrinds.startedAt,
      pausedMs: activeGrinds.pausedMs,
      pauseStartedAt: activeGrinds.pauseStartedAt,
      mesosStart: activeGrinds.mesosStart,
      levelStart: activeGrinds.levelStart,
      expStart: activeGrinds.expStart,
    })
    .from(activeGrinds)
    .innerJoin(characters, eq(activeGrinds.characterId, characters.id))
    .where(eq(activeGrinds.userId, user.id));
  if (!record) return null;
  return {
    ...record,
    startedAt: record.startedAt.getTime(),
    pauseStartedAt: record.pauseStartedAt?.getTime() ?? null,
  };
}
