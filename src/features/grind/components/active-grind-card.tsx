"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { FormFeedback } from "@/components/form-feedback";
import { isTypingInField } from "@/components/keyboard";
import { LevelBar } from "@/components/level-bar";
import { LevelExpFields } from "@/components/level-exp-fields";
import { NumberInput } from "@/components/number-input";
import { useFormAction } from "@/components/use-form-action";
import {
  dayKey,
  formatClock,
  formatDayKey,
  formatDuration,
  formatInteger,
  formatTime,
} from "@/lib/format";
import { elapsedActiveMs, totalPausedMs } from "@/lib/grind-math";
import {
  discardGrindAction,
  finishGrindAction,
  pauseGrindAction,
  resumeGrindAction,
} from "../actions";
import type { ActiveGrind, KnownItem } from "../queries";
import { DropsEditor } from "./drops-editor";

const DEFAULT_TITLE = "Farm Tracker";
const MS_PER_MINUTE = 60_000;

/**
 * Current time on the server's clock, ticking every second. Timestamps of the
 * grind come from the server, so the browser's own clock is only used to
 * measure how much time passed since the page was rendered.
 */
function useServerNow(serverNowAtRender: number): number {
  const [now, setNow] = useState(serverNowAtRender);
  const clockOffset = useRef<number | null>(null);

  useEffect(() => {
    clockOffset.current ??= serverNowAtRender - Date.now();
    const offset = clockOffset.current;
    const interval = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(interval);
  }, [serverNowAtRender]);

  return now;
}

type ActiveGrindCardProps = {
  grind: ActiveGrind;
  serverNow: number;
  timeZone: string;
  knownItems: KnownItem[];
};

export function ActiveGrindCard({ grind, serverNow, timeZone, knownItems }: ActiveGrindCardProps) {
  const now = useServerNow(serverNow);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isUpdating, startUpdate] = useTransition();
  const isPaused = grind.pauseStartedAt !== null;
  const elapsedMs = elapsedActiveMs(grind, now);
  const pausedMs = totalPausedMs(grind, now);
  const clockText = formatClock(elapsedMs);

  useEffect(() => {
    document.title = `${isPaused ? "Pausado " : ""}${clockText} · ${DEFAULT_TITLE}`;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [clockText, isPaused]);

  useEffect(() => {
    if (isFinishing) return;
    function handleShortcut(event: KeyboardEvent) {
      if (isTypingInField(event) || event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "p") startUpdate(() => (isPaused ? resumeGrindAction() : pauseGrindAction()));
      if (key === "f") {
        if (!isPaused) startUpdate(() => pauseGrindAction());
        setIsFinishing(true);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [isFinishing, isPaused]);

  function beginFinishing() {
    if (!isPaused) startUpdate(() => pauseGrindAction());
    setIsFinishing(true);
  }

  function backToGrind() {
    startUpdate(() => resumeGrindAction());
    setIsFinishing(false);
  }

  function discard() {
    if (!window.confirm("Descartar o grind em andamento? O tempo contado será perdido.")) return;
    startUpdate(() => discardGrindAction());
  }

  const startDay = dayKey(grind.startedAt, timeZone);
  const startedOnAnotherDay = startDay !== dayKey(now, timeZone);

  const startSummary = (
    <div className="space-y-3 rounded-lg border border-line bg-bg px-3 py-3 text-[13px]">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <SummaryItem label="Personagem" value={grind.characterName} />
        <SummaryItem label="Monstro" value={grind.monster || "não informado"} />
        <SummaryItem label="Mesos início" value={formatInteger(grind.mesosStart)} />
        <SummaryItem label="EXP início" value={formatInteger(grind.expStart)} />
      </dl>
      <LevelBar level={grind.levelStart} exp={grind.expStart} />
    </div>
  );

  if (isFinishing) {
    return (
      <div className="space-y-4">
        <h2 className="section-title">Finalizar grind</h2>
        <div className="text-center">
          <p className="mb-1.5 inline-flex items-center gap-2 text-[13px] text-muted">
            <span className="size-2.5 rounded-full bg-muted" />
            Tempo de grind
          </p>
          <p className="text-[58px] font-bold leading-tight tracking-wide tabular-nums">{clockText}</p>
          <p className="text-[13px] text-muted">
            Iniciado às <b className="font-semibold text-text">{formatTime(grind.startedAt, timeZone)}</b>
            {pausedMs >= MS_PER_MINUTE ? `, com ${formatDuration(pausedMs)} de pausa` : ""}
          </p>
        </div>
        {startSummary}
        <FinishGrindForm
          levelStart={grind.levelStart}
          knownItems={knownItems}
          isBusy={isUpdating}
          onBack={backToGrind}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="section-title">Grind em andamento</h2>
      <div className="text-center">
        <p className="mb-1.5 inline-flex items-center gap-2 text-[13px] text-muted">
          <span
            className={`size-2.5 rounded-full ${
              isPaused ? "bg-accent" : "bg-good motion-safe:animate-pulse"
            }`}
          />
          {isPaused ? "Pausado" : "Contando"}
        </p>
        <p
          className={`text-[58px] font-bold leading-tight tracking-wide tabular-nums ${
            isPaused ? "text-muted" : ""
          }`}
        >
          {clockText}
        </p>
        <p className="text-[13px] text-muted">
          Início às <b className="font-semibold text-text">{formatTime(grind.startedAt, timeZone)}</b>
          {startedOnAnotherDay ? ` de ${formatDayKey(startDay)}` : ""}
          {pausedMs >= MS_PER_MINUTE ? `, ${formatDuration(pausedMs)} de pausa` : ""}
        </p>
      </div>
      {startSummary}
      <div className="flex gap-2.5">
        <button
          type="button"
          className="btn flex-1 gap-2"
          disabled={isUpdating}
          onClick={() => startUpdate(() => (isPaused ? resumeGrindAction() : pauseGrindAction()))}
        >
          {isPaused ? "Retomar" : "Pausar"}
          <ShortcutHint letter="P" />
        </button>
        <button
          type="button"
          className="btn btn-primary flex-1 gap-2"
          disabled={isUpdating}
          onClick={beginFinishing}
        >
          Finalizar grind
          <ShortcutHint letter="F" />
        </button>
      </div>
      <button type="button" className="btn btn-small btn-danger" disabled={isUpdating} onClick={discard}>
        Descartar este grind
      </button>
    </div>
  );
}

function ShortcutHint({ letter }: { letter: string }) {
  return (
    <kbd className="hidden rounded border border-current px-1 text-[10px] font-medium opacity-60 md:inline">
      {letter}
    </kbd>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

type FinishGrindFormProps = {
  levelStart: number;
  knownItems: KnownItem[];
  isBusy: boolean;
  onBack: () => void;
};

function FinishGrindForm({ levelStart, knownItems, isBusy, onBack }: FinishGrindFormProps) {
  const { state, isPending, onSubmit } = useFormAction(finishGrindAction);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="field-label" htmlFor="mesosEnd">
          Mesos agora
        </label>
        <NumberInput id="mesosEnd" name="mesosEnd" defaultValue={null} isRequired hasAutoFocus />
      </div>
      <LevelExpFields
        levelName="levelEnd"
        expName="expEnd"
        levelLabel="Level"
        expLabel="EXP agora"
        defaultLevel={levelStart}
        defaultExp={null}
      />
      <div>
        <label className="field-label" htmlFor="suppliesCost">
          Custo de suprimentos (opcional)
        </label>
        <NumberInput id="suppliesCost" name="suppliesCost" defaultValue={null} />
        <p className="hint">Valor das poções gastas que você já tinha antes de iniciar.</p>
      </div>
      <DropsEditor initialDrops={[]} knownItems={knownItems} />
      <div>
        <label className="field-label" htmlFor="notes">
          Notas (opcional)
        </label>
        <input id="notes" name="notes" className="input" maxLength={500} autoComplete="off" />
      </div>
      <FormFeedback state={state} />
      <div className="flex gap-2.5">
        <button type="button" className="btn flex-1" disabled={isBusy || isPending} onClick={onBack}>
          Voltar ao grind
        </button>
        <button type="submit" className="btn btn-primary flex-1" disabled={isBusy || isPending}>
          Salvar sessão
        </button>
      </div>
    </form>
  );
}
