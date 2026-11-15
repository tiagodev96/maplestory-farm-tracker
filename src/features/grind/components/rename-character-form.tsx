"use client";

import { FormFeedback } from "@/components/form-feedback";
import { useFormAction } from "@/components/use-form-action";
import { renameCharacterAction } from "../actions";
import type { Character } from "../queries";

export function RenameCharacterForm({ character }: { character: Character }) {
  const { state, isPending, onSubmit } = useFormAction(renameCharacterAction);
  const inputId = `characterName-${character.id}`;

  return (
    <form onSubmit={onSubmit} className="space-y-1">
      <input type="hidden" name="characterId" value={character.id} />
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={inputId}>
          Nome de {character.name}
        </label>
        <input
          id={inputId}
          name="name"
          className="input"
          required
          maxLength={40}
          autoComplete="off"
          defaultValue={character.name}
        />
        <button type="submit" className="btn shrink-0" disabled={isPending}>
          Renomear
        </button>
      </div>
      <FormFeedback state={state} />
    </form>
  );
}
