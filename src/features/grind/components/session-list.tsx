import Link from "next/link";
import { expGained, levelProgressPercent } from "@/lib/exp-table";
import {
  dayKey,
  formatCompact,
  formatDayKey,
  formatDuration,
  formatPercent,
  formatSigned,
  formatTime,
} from "@/lib/format";
import { mesosProfit, perHour } from "@/lib/grind-math";
import type { GrindSession } from "../queries";

/** Compact, tappable rows: the phone layout of the history and the home page summary. */
export function SessionList({
  sessions,
  timeZone,
}: {
  sessions: GrindSession[];
  timeZone: string;
}) {
  return (
    <ul className="divide-y divide-line">
      {sessions.map((session) => {
        const profit = mesosProfit(session);
        const exp = expGained(session);
        return (
          <li key={session.id}>
            <Link
              href={`/history/${session.id}`}
              className="-mx-2 block rounded-lg px-2 py-2.5 hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate font-semibold">{session.monster || "Sem monstro"}</span>
                <span
                  className={`shrink-0 font-semibold tabular-nums ${profit < 0 ? "text-bad" : "text-good"}`}
                >
                  {formatSigned(profit)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {session.characterName} · {formatDayKey(dayKey(session.startedAt, timeZone))} ·{" "}
                {formatTime(session.startedAt, timeZone)} a {formatTime(session.endedAt, timeZone)} ·{" "}
                {formatDuration(session.activeMs)}
              </p>
              <p className="mt-0.5 text-xs tabular-nums">
                <span className="text-accent">
                  {formatCompact(perHour(profit, session.activeMs)) || "0"} mesos/h
                </span>
                <span className="text-muted"> · </span>
                <span className="text-exp">
                  {formatCompact(perHour(exp, session.activeMs)) || "0"} EXP/h
                </span>
                <span className="text-muted">
                  {" "}
                  · Lv {session.levelEnd}{" "}
                  {formatPercent(levelProgressPercent(session.levelEnd, session.expEnd))}
                </span>
              </p>
              {session.notes ? <p className="mt-0.5 text-xs text-muted">{session.notes}</p> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
