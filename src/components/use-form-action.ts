"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { EMPTY_FORM_STATE, type FormState } from "@/features/grind/form-state";

type FormAction = (previous: FormState, formData: FormData) => Promise<FormState>;

/**
 * Runs a server action from `onSubmit` instead of the form's `action` prop.
 * React resets uncontrolled fields after a form `action`, which would wipe what
 * the user typed whenever the server answers with a validation error.
 */
export function useFormAction(action: FormAction, prepare?: (formData: FormData) => void) {
  const [state, dispatch, isPending] = useActionState(action, EMPTY_FORM_STATE);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    prepare?.(formData);
    startTransition(() => dispatch(formData));
  }

  return { state, isPending, onSubmit };
}
