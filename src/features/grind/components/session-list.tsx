import Link from "next/link";
import { expGained, levelProgressPercent } from "@/lib/exp-table";
import {
  dayKey,
  formatCompact,
  formatDayKey,
  formatDuration,
  formatPercent,
  formatSigned,
} from "@/lib/format";
import { netProfit, perHour } from "@/lib/grind-math";
import type { GrindSession } from "../queries";

type SessionListProps = {
  sessions: GrindSession[];
  timeZone: string;
  /** Sessions holding the EXP/h record of their monster. */
  recordIds: Set<string>;
  /** Public pages show the rows without links to the edit form. */
  isReadOnly?: boolean;
};

/** Compact rows: the phone layout of the history, the home summary and the public page. */
export function SessionList({ sessions, timeZone, recordIds, isReadOnly = false }: SessionListProps) {
  return (
    <ul className="divide-y divide-line">
      {sessions.map((session) => {
        const row = (
          <SessionRow session={session} timeZone={timeZone} isRecord={recordIds.has(session.id)} />
        );
        return (
          <li key={session.id}>
            {isReadOnly ? (
              <div className="py-2.5">{row}</div>
            ) : (
              <Link
                href={`/history/${session.id}`}
                className="-mx-2 block rounded-lg px-2 py-2.5 hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-accent"
              >
                {row}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SessionRow({
  session,
  timeZone,
  isRecord,
}: {
  session: GrindSession;
  timeZone: string;
  isRecord: boolean;
}) {
  const profit = netProfit(session);
  const exp = expGained(session);
  const levelsGained = session.levelEnd - session.levelStart;

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-semibold">{session.monster || "Sem monstro"}</span>
          {session.map ? <span className="truncate text-xs text-muted">{session.map}</span> : null}
        </span>
        <span
          className={`shrink-0 font-semibold tabular-nums ${profit < 0 ? "text-bad" : "text-good"}`}
        >
          {formatSigned(profit)}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted">
        {session.characterName} · {formatDayKey(dayKey(session.startedAt, timeZone))} ·{" "}
        {formatDuration(session.activeMs)}
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs tabular-nums">
        <span className="text-accent">
          {formatCompact(perHour(profit, session.activeMs)) || "0"} lucro/h
        </span>
        <span className="text-muted">·</span>
        <span className="text-exp">{formatCompact(perHour(exp, session.activeMs)) || "0"} EXP/h</span>
        <span className="text-muted">
          · Lv {session.levelEnd}{" "}
          {formatPercent(levelProgressPercent(session.levelEnd, session.expEnd))}
        </span>
        {levelsGained > 0 ? <Tag tone="text-expbar">+{levelsGained} Lv</Tag> : null}
        {isRecord ? <Tag tone="text-exp">recorde EXP/h</Tag> : null}
        {session.isParty ? <Tag tone="text-muted">party</Tag> : null}
      </p>
      {session.notes ? <p className="mt-0.5 text-xs text-muted">{session.notes}</p> : null}
    </>
  );
}

function Tag({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={`rounded border border-current px-1 text-[10px] font-semibold ${tone}`}>
      {children}
    </span>
  );
}
