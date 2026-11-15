import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, type Database } from "@/db/client";
import { activeGrinds, characters, grindSessions, sessionDrops } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import type { GrindTimer, SessionMetrics } from "@/lib/grind-math";

export type Character = { id: string; name: string; publicSlug: string | null };

export type GrindSession = SessionMetrics & {
  id: string;
  characterId: string;
  characterName: string;
  monster: string;
  map: string;
  isParty: boolean;
  startedAt: number;
  endedAt: number;
  notes: string;
};

export type SessionDrop = { itemName: string; quantity: number; unitPrice: number };

export type KnownItem = { itemName: string; unitPrice: number };

export type ActiveGrind = GrindTimer & {
  characterName: string;
  monster: string;
  map: string;
  isParty: boolean;
  mesosStart: number;
  levelStart: number;
  expStart: number;
};

export async function listCharacters(): Promise<Character[]> {
  const user = await requireUser();
  const db = await getDb();
  return db
    .select({ id: characters.id, name: characters.name, publicSlug: characters.publicSlug })
    .from(characters)
    .where(eq(characters.userId, user.id))
    .orderBy(asc(characters.createdAt));
}

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

/** Sessions joined with their character and the summed value of their drops. */
function selectSessions(db: Database) {
  const dropTotals = db
    .select({
      sessionId: sessionDrops.sessionId,
      value: sql<number>`sum(${sessionDrops.quantity} * ${sessionDrops.unitPrice})`.as("value"),
    })
    .from(sessionDrops)
    .groupBy(sessionDrops.sessionId)
    .as("drop_totals");

  return db
    .select({
      id: grindSessions.id,
      characterId: grindSessions.characterId,
      characterName: characters.name,
      monster: grindSessions.monster,
      map: grindSessions.map,
      isParty: grindSessions.isParty,
      startedAt: grindSessions.startedAt,
      endedAt: grindSessions.endedAt,
      activeMs: grindSessions.activeMs,
      mesosStart: grindSessions.mesosStart,
      mesosEnd: grindSessions.mesosEnd,
      levelStart: grindSessions.levelStart,
      expStart: grindSessions.expStart,
      levelEnd: grindSessions.levelEnd,
      expEnd: grindSessions.expEnd,
      suppliesCost: grindSessions.suppliesCost,
      // Postgres returns sum() of bigint as a numeric string.
      dropsValue: sql<number>`coalesce(${dropTotals.value}, 0)`.mapWith(Number),
      notes: grindSessions.notes,
    })
    .from(grindSessions)
    .innerJoin(characters, eq(grindSessions.characterId, characters.id))
    .leftJoin(dropTotals, eq(dropTotals.sessionId, grindSessions.id));
}

/** Sessions of the signed-in user, newest first, optionally limited to one character. */
export async function listSessions(characterId: string | null): Promise<GrindSession[]> {
  const user = await requireUser();
  const db = await getDb();
  const records = await selectSessions(db)
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
  const [record] = await selectSessions(db).where(
    and(eq(grindSessions.id, sessionId), eq(grindSessions.userId, user.id)),
  );
  return record ? toGrindSession(record) : null;
}

export async function listSessionDrops(sessionId: string): Promise<SessionDrop[]> {
  const user = await requireUser();
  const db = await getDb();
  return db
    .select({
      itemName: sessionDrops.itemName,
      quantity: sessionDrops.quantity,
      unitPrice: sessionDrops.unitPrice,
    })
    .from(sessionDrops)
    .innerJoin(grindSessions, eq(sessionDrops.sessionId, grindSessions.id))
    .where(and(eq(sessionDrops.sessionId, sessionId), eq(grindSessions.userId, user.id)))
    .orderBy(asc(sessionDrops.itemName));
}

/**
 * Public, read-only view of a character whose owner enabled sharing. This is the
 * only query that does not require a signed-in user; the slug is the capability.
 */
export async function getPublicCharacter(
  publicSlug: string,
): Promise<{ name: string; sessions: GrindSession[] } | null> {
  const db = await getDb();
  const [character] = await db
    .select({ id: characters.id, name: characters.name })
    .from(characters)
    .where(eq(characters.publicSlug, publicSlug));
  if (!character) return null;

  const records = await selectSessions(db)
    .where(eq(grindSessions.characterId, character.id))
    .orderBy(desc(grindSessions.startedAt));
  // Notes are personal; the public page never receives them.
  const sessions = records.map((record) => ({ ...toGrindSession(record), notes: "" }));
  return { name: character.name, sessions };
}

async function listDistinctSessionText(column: "monster" | "map"): Promise<string[]> {
  const user = await requireUser();
  const db = await getDb();
  const records = await db
    .selectDistinct({ value: grindSessions[column] })
    .from(grindSessions)
    .where(eq(grindSessions.userId, user.id))
    .orderBy(asc(grindSessions[column]));
  return records.map((record) => record.value).filter((value) => value !== "");
}

/** Monster names the user has typed before, for autocomplete. */
export function listKnownMonsters(): Promise<string[]> {
  return listDistinctSessionText("monster");
}

/** Map names the user has typed before, for autocomplete. */
export function listKnownMaps(): Promise<string[]> {
  return listDistinctSessionText("map");
}

/** Items the user has logged before, each with the price used most recently. */
export async function listKnownItems(): Promise<KnownItem[]> {
  const user = await requireUser();
  const db = await getDb();
  const newestFirst = await db
    .select({ itemName: sessionDrops.itemName, unitPrice: sessionDrops.unitPrice })
    .from(sessionDrops)
    .innerJoin(grindSessions, eq(sessionDrops.sessionId, grindSessions.id))
    .where(eq(grindSessions.userId, user.id))
    .orderBy(desc(grindSessions.startedAt));

  const latestPriceByItem = new Map<string, number>();
  for (const drop of newestFirst) {
    if (!latestPriceByItem.has(drop.itemName)) latestPriceByItem.set(drop.itemName, drop.unitPrice);
  }
  return [...latestPriceByItem]
    .map(([itemName, unitPrice]) => ({ itemName, unitPrice }))
    .sort((first, second) => first.itemName.localeCompare(second.itemName));
}

export async function getActiveGrind(): Promise<ActiveGrind | null> {
  const user = await requireUser();
  const db = await getDb();
  const [record] = await db
    .select({
      characterName: characters.name,
      monster: activeGrinds.monster,
      map: activeGrinds.map,
      isParty: activeGrinds.isParty,
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
