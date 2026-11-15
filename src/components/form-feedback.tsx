import type { FormState } from "@/features/grind/form-state";

export function FormFeedback({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-bad">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm text-good">
        {state.message}
      </p>
    );
  }
  return null;
}
