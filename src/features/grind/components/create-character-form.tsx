"use client";

import { useActionState } from "react";
import { FormFeedback } from "@/components/form-feedback";
import { createCharacterAction } from "../actions";
import { EMPTY_FORM_STATE } from "../form-state";

export function CreateCharacterForm() {
  const [state, formAction, isPending] = useActionState(createCharacterAction, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-2">
      <label className="field-label" htmlFor="newCharacterName">
        Nome do personagem
      </label>
      <div className="flex gap-2">
        <input
          id="newCharacterName"
          name="name"
          className="input"
          required
          maxLength={40}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={isPending}>
          Adicionar
        </button>
      </div>
      <FormFeedback state={state} />
    </form>
  );
}
