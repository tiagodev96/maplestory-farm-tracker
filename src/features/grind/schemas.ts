import { z } from "zod";
import { MAX_LEVEL } from "@/lib/exp-table";
import { parseAmount, parseInteger } from "@/lib/format";

// Far above anything the game allows; only guards the bigint columns against garbage.
const MAX_AMOUNT = 1_000_000_000_000;

function formInteger(label: string) {
  const message = `Preencha ${label}.`;
  return z
    .string({ error: message })
    .transform(parseAmount)
    .pipe(z.number({ error: message }).int());
}

const amount = (label: string) =>
  formInteger(label).pipe(
    z.number().min(0, `${label} não pode ser negativo.`).max(MAX_AMOUNT, `${label} é alto demais.`),
  );

const level = (label: string) =>
  formInteger(label).pipe(
    z
      .number()
      .min(1, `Level precisa estar entre 1 e ${MAX_LEVEL}.`)
      .max(MAX_LEVEL, `Level precisa estar entre 1 e ${MAX_LEVEL}.`),
  );

const characterId = z.uuid({ error: "Escolha um personagem." });
const monster = z.string().trim().max(80, "Nome do monstro muito longo.").default("");
const notes = z.string().trim().max(500, "Notas muito longas.").default("");
const timestampMs = (label: string) =>
  z.coerce.number({ error: `Preencha ${label}.` }).int().positive(`Preencha ${label}.`);

export const characterNameSchema = z
  .string({ error: "Informe o nome do personagem." })
  .trim()
  .min(1, "Informe o nome do personagem.")
  .max(40, "Nome muito longo.");

export const startGrindSchema = z.object({
  characterId,
  monster,
  mesosStart: amount("mesos"),
  levelStart: level("level"),
  expStart: amount("EXP"),
});

export const finishGrindSchema = z.object({
  mesosEnd: amount("mesos"),
  levelEnd: level("level"),
  expEnd: amount("EXP"),
  notes,
});

export const sessionSchema = z
  .object({
    id: z.uuid().optional(),
    characterId,
    monster,
    startedAt: timestampMs("o início"),
    endedAt: timestampMs("o fim"),
    activeMinutes: z
      .string()
      .default("")
      .transform(parseInteger)
      .pipe(z.number().int().positive().nullable().catch(null)),
    mesosStart: amount("mesos início"),
    mesosEnd: amount("mesos fim"),
    levelStart: level("level início"),
    expStart: amount("EXP início"),
    levelEnd: level("level fim"),
    expEnd: amount("EXP fim"),
    notes,
  })
  .refine((session) => session.endedAt > session.startedAt, {
    message: "O fim precisa ser depois do início.",
  });

/** Backup file exported by the original single-file tracker (legacy/farm-tracker.html). */
export const legacyBackupSchema = z.object({
  sessions: z.array(
    z.object({
      char: z.string().trim().min(1).max(40),
      monster: z.string().trim().max(80).nullish(),
      start: z.number().int().positive(),
      end: z.number().int().positive(),
      activeMs: z.number().int().positive().optional(),
      mesosStart: z.number().int().min(0).max(MAX_AMOUNT),
      mesosEnd: z.number().int().min(0).max(MAX_AMOUNT),
      lvStart: z.number().int().min(1).max(MAX_LEVEL),
      expStart: z.number().int().min(0).max(MAX_AMOUNT),
      lvEnd: z.number().int().min(1).max(MAX_LEVEL),
      expEnd: z.number().int().min(0).max(MAX_AMOUNT),
      notes: z.string().max(500).nullish(),
    }),
  ),
});
