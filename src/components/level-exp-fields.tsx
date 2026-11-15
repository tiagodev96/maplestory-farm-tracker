"use client";

import { useState } from "react";
import { expToNextLevel, isValidLevel, levelProgressPercent, MAX_LEVEL } from "@/lib/exp-table";
import { formatInteger, formatPercent } from "@/lib/format";
import { NumberInput } from "./number-input";

type LevelExpFieldsProps = {
  levelName: string;
  expName: string;
  levelLabel: string;
  expLabel: string;
  defaultLevel: number | null;
  defaultExp: number | null;
};

function describeProgress(level: number | null, exp: number | null): string {
  if (level === null || exp === null) return "";
  if (!isValidLevel(level)) return `Level fora da tabela (1 a ${MAX_LEVEL}).`;
  const needed = expToNextLevel(level);
  if (needed !== null && exp >= needed) {
    return `Acima do total do level ${level} (${formatInteger(needed)}).`;
  }
  const percent = levelProgressPercent(level, exp);
  return percent === null ? "" : `${formatPercent(percent)} do level ${level}`;
}

export function LevelExpFields({
  levelName,
  expName,
  levelLabel,
  expLabel,
  defaultLevel,
  defaultExp,
}: LevelExpFieldsProps) {
  const [level, setLevel] = useState(defaultLevel);
  const [exp, setExp] = useState(defaultExp);

  return (
    <div>
      <div className="grid grid-cols-[90px_1fr] gap-3">
        <div>
          <label className="field-label" htmlFor={levelName}>
            {levelLabel}
          </label>
          <NumberInput
            id={levelName}
            name={levelName}
            defaultValue={defaultLevel}
            isPlain
            isRequired
            onValueChange={setLevel}
          />
        </div>
        <div>
          <label className="field-label" htmlFor={expName}>
            {expLabel}
          </label>
          <NumberInput
            id={expName}
            name={expName}
            defaultValue={defaultExp}
            isRequired
            onValueChange={setExp}
          />
        </div>
      </div>
      <p className="hint" aria-live="polite">
        {describeProgress(level, exp)}
      </p>
    </div>
  );
}
