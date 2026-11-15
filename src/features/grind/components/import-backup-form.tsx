"use client";

import { useActionState } from "react";
import { FormFeedback } from "@/components/form-feedback";
import { importLegacyBackupAction } from "../actions";
import { EMPTY_FORM_STATE } from "../form-state";

export function ImportBackupForm() {
  const [state, formAction, isPending] = useActionState(importLegacyBackupAction, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="field-label" htmlFor="backupFile">
          Arquivo de backup (.json)
        </label>
        <input
          id="backupFile"
          name="file"
          type="file"
          accept="application/json,.json"
          required
          className="input"
        />
      </div>
      <FormFeedback state={state} />
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? "Importando..." : "Importar backup"}
      </button>
    </form>
  );
}
