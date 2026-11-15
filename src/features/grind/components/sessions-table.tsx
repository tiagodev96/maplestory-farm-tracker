import Link from "next/link";
import { expGained, levelProgressPercent } from "@/lib/exp-table";
import {
  dayKey,
  formatDayKey,
  formatDuration,
  formatInteger,
  formatPercent,
  formatSigned,
  formatTime,
} from "@/lib/format";
import { mesosProfit, perHour } from "@/lib/grind-math";
import type { GrindSession } from "../queries";

function levelProgress(level: number, exp: number): string {
  return `Lv ${level} ${formatPercent(levelProgressPercent(level, exp))}`;
}

export function SessionsTable({
  sessions,
  timeZone,
}: {
  sessions: GrindSession[];
  timeZone: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Data</th>
            <th className="cell-left">Personagem</th>
            <th className="cell-left">Monstro</th>
            <th>Horário</th>
            <th>Tempo</th>
            <th>Mesos</th>
            <th>Lucro</th>
            <th>Mesos/h</th>
            <th>EXP</th>
            <th>EXP ganho</th>
            <th>EXP/h</th>
            <th>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => {
            const profit = mesosProfit(session);
            const exp = expGained(session);
            return (
              <tr key={session.id}>
                <td>{formatDayKey(dayKey(session.startedAt, timeZone))}</td>
                <td className="cell-left">{session.characterName}</td>
                <td className="cell-left">
                  {session.monster}
                  {session.notes ? <small>{session.notes}</small> : null}
                </td>
                <td>
                  {formatTime(session.startedAt, timeZone)} a {formatTime(session.endedAt, timeZone)}
                </td>
                <td>{formatDuration(session.activeMs)}</td>
                <td>
                  {formatInteger(session.mesosEnd)}
                  <small>de {formatInteger(session.mesosStart)}</small>
                </td>
                <td className={profit < 0 ? "text-bad" : "text-good"}>{formatSigned(profit)}</td>
                <td>{formatInteger(perHour(profit, session.activeMs))}</td>
                <td>
                  {levelProgress(session.levelEnd, session.expEnd)}
                  <small>de {levelProgress(session.levelStart, session.expStart)}</small>
                </td>
                <td>{formatInteger(exp)}</td>
                <td>{formatInteger(perHour(exp, session.activeMs))}</td>
                <td>
                  <Link className="btn btn-small" href={`/history/${session.id}`}>
                    Editar
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
