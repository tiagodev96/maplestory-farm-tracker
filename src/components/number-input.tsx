"use client";

import { useState } from "react";
import { formatInteger, parseAmount, parseInteger } from "@/lib/format";

type NumberInputProps = {
  id: string;
  name: string;
  defaultValue: number | null;
  /** Show the raw digits instead of thousands separators (levels, minutes). */
  isPlain?: boolean;
  isRequired?: boolean;
  hasAutoFocus?: boolean;
  onValueChange?: (value: number | null) => void;
};

const COMPLETE_SHORTHAND = /^\d+([.,]\d+)?\s*[km]$/i;
// A decimal comma only makes sense on the way to a suffix: "1," then "1,2" then "1,2m".
const SHORTHAND_IN_PROGRESS = /^\d+,\d*$/;

function toText(value: number | null, isPlain: boolean): string {
  if (value === null) return "";
  return isPlain ? String(value) : formatInteger(value);
}

function reformat(typed: string, isPlain: boolean): string {
  if (isPlain) return toText(parseInteger(typed), true);
  const trimmed = typed.trim();
  if (COMPLETE_SHORTHAND.test(trimmed)) return toText(parseAmount(trimmed), false);
  if (SHORTHAND_IN_PROGRESS.test(trimmed)) return trimmed;
  return toText(parseInteger(typed), false);
}

export function NumberInput({
  id,
  name,
  defaultValue,
  isPlain = false,
  isRequired = false,
  hasAutoFocus = false,
  onValueChange,
}: NumberInputProps) {
  const [text, setText] = useState(toText(defaultValue, isPlain));

  return (
    <input
      id={id}
      name={name}
      className="input"
      inputMode={isPlain ? "numeric" : "text"}
      autoComplete="off"
      required={isRequired}
      autoFocus={hasAutoFocus}
      value={text}
      onFocus={(event) => event.target.select()}
      onChange={(event) => {
        const nextText = reformat(event.target.value, isPlain);
        setText(nextText);
        onValueChange?.(parseAmount(nextText));
      }}
      onBlur={() => {
        if (!SHORTHAND_IN_PROGRESS.test(text)) return;
        const rounded = Math.round(Number(text.replace(",", ".")));
        setText(toText(rounded, isPlain));
        onValueChange?.(rounded);
      }}
    />
  );
}
