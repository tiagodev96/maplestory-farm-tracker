"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, type Database } from "@/db/client";
import { activeGrinds, characters, grindSessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { elapsedActiveMs } from "@/lib/grind-math";
import { ACTIVE_CHARACTER_COOKIE } from "@/lib/request-preferences";
import type { FormState } from "./form-state";
import {
  characterNameSchema,
  finishGrindSchema,
  legacyBackupSchema,
  sessionSchema,
  startGrindSchema,
} from "./schemas";

const MS_PER_MINUTE = 60_000;
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

function validationError(error: z.ZodError): FormState {
  return { error: error.issues[0]?.message ?? "Dados inválidos." };
}

function revalidateApp() {
  revalidatePath("/", "layout");
}

async function ownsCharacter(db: Database, userId: string, characterId: string) {
  const [owned] = await db
    .select({ id: characters.id })
    .from(characters)
    .where(and(eq(characters.id, characterId), eq(characters.userId, userId)));
  return owned !== undefined;
}

async function isCharacterNameTaken(db: Database, userId: string, name: string) {
  const [existing] = await db
    .select({ id: characters.id })
    .from(characters)
    .where(and(eq(characters.userId, userId), eq(characters.name, name)));
  return existing !== undefined;
}

export async function createCharacterAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const name = characterNameSchema.safeParse(formData.get("name"));
  if (!name.success) return validationError(name.error);

  const db = await getDb();
  if (await isCharacterNameTaken(db, user.id, name.data)) {
    return { error: "Você já tem um personagem com esse nome." };
  }
  await db.insert(characters).values({ userId: user.id, name: name.data });
  revalidateApp();
  return { error: null };
}

export async function renameCharacterAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const characterId = z.uuid().safeParse(formData.get("characterId"));
  const name = characterNameSchema.safeParse(formData.get("name"));
  if (!characterId.success) return { error: "Personagem inválido." };
  if (!name.success) return validationError(name.error);

  const db = await getDb();
  const [current] = await db
    .select({ name: characters.name })
    .from(characters)
    .where(and(eq(characters.id, characterId.data), eq(characters.userId, user.id)));
  if (!current) return { error: "Personagem não encontrado." };
  if (current.name === name.data) return { error: null, message: "Salvo." };
  if (await isCharacterNameTaken(db, user.id, name.data)) {
    return { error: "Você já tem um personagem com esse nome." };
  }

  await db
    .update(characters)
    .set({ name: name.data })
    .where(and(eq(characters.id, characterId.data), eq(characters.userId, user.id)));
  revalidateApp();
  return { error: null, message: "Salvo." };
}

/** Sets the header filter; an empty id means "all characters". */
export async function setActiveCharacterAction(characterId: string): Promise<void> {
  await requireUser();
  const cookieStore = await cookies();
  if (z.uuid().safeParse(characterId).success) {
    cookieStore.set(ACTIVE_CHARACTER_COOKIE, characterId, {
      maxAge: ONE_YEAR_IN_SECONDS,
      sameSite: "lax",
      path: "/",
    });
  } else {
    cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  }
  revalidateApp();
}

export async function startGrindAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = startGrindSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error);

  const db = await getDb();
  if (!(await ownsCharacter(db, user.id, parsed.data.characterId))) {
    return { error: "Personagem não encontrado." };
  }
  const inserted = await db
    .insert(activeGrinds)
    .values({ ...parsed.data, userId: user.id, startedAt: new Date() })
    .onConflictDoNothing()
    .returning({ userId: activeGrinds.userId });
  if (inserted.length === 0) {
    return { error: "Já existe um grind em andamento." };
  }
  revalidateApp();
  return { error: null };
}

async function findActiveGrind(db: Database, userId: string) {
  const [active] = await db.select().from(activeGrinds).where(eq(activeGrinds.userId, userId));
  return active ?? null;
}

export async function pauseGrindAction(): Promise<void> {
  const user = await requireUser();
  const db = await getDb();
  const active = await findActiveGrind(db, user.id);
  if (!active || active.pauseStartedAt) return;
  await db
    .update(activeGrinds)
    .set({ pauseStartedAt: new Date() })
    .where(eq(activeGrinds.userId, user.id));
  revalidateApp();
}

export async function resumeGrindAction(): Promise<void> {
  const user = await requireUser();
  const db = await getDb();
  const active = await findActiveGrind(db, user.id);
  if (!active?.pauseStartedAt) return;
  await db
    .update(activeGrinds)
    .set({
      pausedMs: active.pausedMs + (Date.now() - active.pauseStartedAt.getTime()),
      pauseStartedAt: null,
    })
    .where(eq(activeGrinds.userId, user.id));
  revalidateApp();
}

export async function discardGrindAction(): Promise<void> {
  const user = await requireUser();
  const db = await getDb();
  await db.delete(activeGrinds).where(eq(activeGrinds.userId, user.id));
  revalidateApp();
}

export async function finishGrindAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = finishGrindSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error);

  const db = await getDb();
  const active = await findActiveGrind(db, user.id);
  if (!active) return { error: "Não há grind em andamento." };

  // A grind paused before finishing ends when the pause began, not when the form was submitted.
  const endedAt = active.pauseStartedAt ?? new Date();
  const timer = {
    startedAt: active.startedAt.getTime(),
    pausedMs: active.pausedMs,
    pauseStartedAt: active.pauseStartedAt?.getTime() ?? null,
  };

  await db.transaction(async (transaction) => {
    await transaction.insert(grindSessions).values({
      userId: user.id,
      characterId: active.characterId,
      monster: active.monster,
      startedAt: active.startedAt,
      endedAt,
      activeMs: elapsedActiveMs(timer, endedAt.getTime()),
      mesosStart: active.mesosStart,
      levelStart: active.levelStart,
      expStart: active.expStart,
      ...parsed.data,
    });
    await transaction.delete(activeGrinds).where(eq(activeGrinds.userId, user.id));
  });
  revalidateApp();
  return { error: null };
}

export async function saveSessionAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const fields = Object.fromEntries(formData);
  if (fields.id === "") delete fields.id;
  const parsed = sessionSchema.safeParse(fields);
  if (!parsed.success) return validationError(parsed.error);

  const { id, activeMinutes, startedAt, endedAt, ...rest } = parsed.data;
  const db = await getDb();
  if (!(await ownsCharacter(db, user.id, rest.characterId))) {
    return { error: "Personagem não encontrado." };
  }

  const wallClockMs = endedAt - startedAt;
  const values = {
    ...rest,
    startedAt: new Date(startedAt),
    endedAt: new Date(endedAt),
    activeMs:
      activeMinutes === null
        ? wallClockMs
        : Math.min(activeMinutes * MS_PER_MINUTE, wallClockMs),
  };

  if (id) {
    const updated = await db
      .update(grindSessions)
      .set(values)
      .where(and(eq(grindSessions.id, id), eq(grindSessions.userId, user.id)))
      .returning({ id: grindSessions.id });
    if (updated.length === 0) return { error: "Sessão não encontrada." };
  } else {
    await db.insert(grindSessions).values({ ...values, userId: user.id });
  }
  revalidateApp();
  redirect("/history");
}

export async function deleteSessionAction(sessionId: string): Promise<void> {
  const user = await requireUser();
  if (!z.uuid().safeParse(sessionId).success) return;
  const db = await getDb();
  await db
    .delete(grindSessions)
    .where(and(eq(grindSessions.id, sessionId), eq(grindSessions.userId, user.id)));
  revalidateApp();
  redirect("/history");
}

export async function importLegacyBackupAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Escolha o arquivo de backup (.json)." };
  }

  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    // Any parse failure means the same thing to the user: wrong file.
    return { error: "Este arquivo não é um backup válido do Farm Tracker." };
  }
  const backup = legacyBackupSchema.safeParse(json);
  if (!backup.success) {
    return { error: "Este arquivo não é um backup válido do Farm Tracker." };
  }
  const importable = backup.data.sessions.filter((session) => session.end > session.start);

  const db = await getDb();
  const importedCount = await db.transaction(async (transaction) => {
    const owned = await transaction
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(eq(characters.userId, user.id));
    const characterIdByName = new Map(owned.map((character) => [character.name, character.id]));

    const missingNames = [...new Set(importable.map((session) => session.char))].filter(
      (name) => !characterIdByName.has(name),
    );
    if (missingNames.length > 0) {
      const created = await transaction
        .insert(characters)
        .values(missingNames.map((name) => ({ userId: user.id, name })))
        .returning({ id: characters.id, name: characters.name });
      for (const character of created) characterIdByName.set(character.name, character.id);
    }

    const existing = await transaction
      .select({ characterId: grindSessions.characterId, startedAt: grindSessions.startedAt })
      .from(grindSessions)
      .where(eq(grindSessions.userId, user.id));
    const sessionKey = (characterId: string, startedAt: number) => `${characterId}:${startedAt}`;
    const alreadyImported = new Set(
      existing.map((session) => sessionKey(session.characterId, session.startedAt.getTime())),
    );

    const newSessions = importable.flatMap((session) => {
      const characterId = characterIdByName.get(session.char);
      if (!characterId || alreadyImported.has(sessionKey(characterId, session.start))) return [];
      return [
        {
          userId: user.id,
          characterId,
          monster: session.monster ?? "",
          startedAt: new Date(session.start),
          endedAt: new Date(session.end),
          activeMs: Math.min(session.activeMs ?? session.end - session.start, session.end - session.start),
          mesosStart: session.mesosStart,
          mesosEnd: session.mesosEnd,
          levelStart: session.lvStart,
          expStart: session.expStart,
          levelEnd: session.lvEnd,
          expEnd: session.expEnd,
          notes: session.notes ?? "",
        },
      ];
    });
    if (newSessions.length > 0) await transaction.insert(grindSessions).values(newSessions);
    return newSessions.length;
  });

  revalidateApp();
  const skippedCount = backup.data.sessions.length - importedCount;
  const skippedNote = skippedCount > 0 ? ` ${skippedCount} já existiam ou eram inválidas.` : "";
  return { error: null, message: `${importedCount} sessões importadas.${skippedNote}` };
}
