"use client";

import Link from "next/link";
import { useTransition } from "react";
import { FormFeedback } from "@/components/form-feedback";
import { LevelExpFields } from "@/components/level-exp-fields";
import { NumberInput } from "@/components/number-input";
import { useFormAction } from "@/components/use-form-action";
import { toDateTimeLocal } from "@/lib/format";
import { deleteSessionAction, saveSessionAction } from "../actions";
import type { Character } from "../queries";

const MS_PER_MINUTE = 60_000;

export type SessionFormValues = {
  id: string | null;
  characterId: string;
  monster: string;
  startedAt: number;
  endedAt: number;
  activeMs: number | null;
  mesosStart: number | null;
  mesosEnd: number | null;
  levelStart: number | null;
  expStart: number | null;
  levelEnd: number | null;
  expEnd: number | null;
  notes: string;
};

type SessionFormProps = {
  values: SessionFormValues;
  characters: Character[];
  knownMonsters: string[];
  timeZone: string;
};

export function SessionForm({ values, characters, knownMonsters, timeZone }: SessionFormProps) {
  const initialStartText = toDateTimeLocal(values.startedAt, timeZone);
  const initialEndText = toDateTimeLocal(values.endedAt, timeZone);
  const [isDeleting, startDelete] = useTransition();

  // datetime-local only has minute precision, so an untouched field keeps the
  // original timestamp instead of silently dropping its seconds.
  function resolveTimestamp(formData: FormData, field: string, initialText: string, initial: number) {
    const text = String(formData.get(field) ?? "");
    const timestamp = text === initialText ? initial : new Date(text).getTime();
    return Number.isNaN(timestamp) ? "" : String(timestamp);
  }

  const { state, isPending, onSubmit } = useFormAction(saveSessionAction, (formData) => {
    formData.set(
      "startedAt",
      resolveTimestamp(formData, "startedAtLocal", initialStartText, values.startedAt),
    );
    formData.set("endedAt", resolveTimestamp(formData, "endedAtLocal", initialEndText, values.endedAt));
  });

  function deleteSession(sessionId: string) {
    if (!window.confirm("Excluir esta sessão? Não dá para desfazer.")) return;
    startDelete(() => deleteSessionAction(sessionId));
  }

  const isBusy = isPending || isDeleting;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={values.id ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="characterId">
            Personagem
          </label>
          <select id="characterId" name="characterId" className="input" defaultValue={values.characterId}>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="monster">
            Monstro
          </label>
          <input
            id="monster"
            name="monster"
            className="input"
            list="knownMonsters"
            maxLength={80}
            autoComplete="off"
            defaultValue={values.monster}
          />
          <datalist id="knownMonsters">
            {knownMonsters.map((monster) => (
              <option key={monster} value={monster} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="startedAtLocal">
            Início
          </label>
          <input
            id="startedAtLocal"
            name="startedAtLocal"
            type="datetime-local"
            className="input"
            required
            defaultValue={initialStartText}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="endedAtLocal">
            Fim
          </label>
          <input
            id="endedAtLocal"
            name="endedAtLocal"
            type="datetime-local"
            className="input"
            required
            defaultValue={initialEndText}
          />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="activeMinutes">
          Minutos de grind (sem as pausas)
        </label>
        <NumberInput
          id="activeMinutes"
          name="activeMinutes"
          isPlain
          defaultValue={values.activeMs === null ? null : Math.round(values.activeMs / MS_PER_MINUTE)}
        />
        <p className="hint">Em branco, vale o intervalo entre início e fim.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="mesosStart">
            Mesos início
          </label>
          <NumberInput id="mesosStart" name="mesosStart" defaultValue={values.mesosStart} isRequired />
        </div>
        <div>
          <label className="field-label" htmlFor="mesosEnd">
            Mesos fim
          </label>
          <NumberInput id="mesosEnd" name="mesosEnd" defaultValue={values.mesosEnd} isRequired />
        </div>
      </div>

      <LevelExpFields
        levelName="levelStart"
        expName="expStart"
        levelLabel="Lv início"
        expLabel="EXP início"
        defaultLevel={values.levelStart}
        defaultExp={values.expStart}
      />
      <LevelExpFields
        levelName="levelEnd"
        expName="expEnd"
        levelLabel="Lv fim"
        expLabel="EXP fim"
        defaultLevel={values.levelEnd}
        defaultExp={values.expEnd}
      />

      <div>
        <label className="field-label" htmlFor="notes">
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          className="input min-h-[60px] resize-y"
          maxLength={500}
          defaultValue={values.notes}
        />
      </div>

      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-2.5">
        <Link href="/history" className="btn flex-1">
          Cancelar
        </Link>
        {values.id ? (
          <button
            type="button"
            className="btn btn-danger flex-1"
            disabled={isBusy}
            onClick={() => values.id && deleteSession(values.id)}
          >
            Excluir
          </button>
        ) : null}
        <button type="submit" className="btn btn-primary flex-1" disabled={isBusy}>
          Salvar
        </button>
      </div>
    </form>
  );
}
