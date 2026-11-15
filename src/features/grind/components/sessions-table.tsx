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
import { netProfit, perHour } from "@/lib/grind-math";
import type { GrindSession } from "../queries";

function levelProgress(level: number, exp: number): string {
  return `Lv ${level} ${formatPercent(levelProgressPercent(level, exp))}`;
}

/** What turned the mesos gained into the net profit, when anything did. */
function profitBreakdown(session: GrindSession): string {
  const parts: string[] = [];
  if (session.dropsValue > 0) parts.push(`drops +${formatInteger(session.dropsValue)}`);
  if (session.suppliesCost > 0) parts.push(`supr. -${formatInteger(session.suppliesCost)}`);
  return parts.join(" · ");
}

type SessionsTableProps = {
  sessions: GrindSession[];
  timeZone: string;
  /** Sessions holding the EXP/h record of their monster. */
  recordIds: Set<string>;
};

export function SessionsTable({ sessions, timeZone, recordIds }: SessionsTableProps) {
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
            <th>Lucro líq.</th>
            <th>Lucro/h</th>
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
            const profit = netProfit(session);
            const exp = expGained(session);
            const breakdown = profitBreakdown(session);
            const place = [session.map, session.isParty ? "party" : "", session.notes]
              .filter(Boolean)
              .join(" · ");
            return (
              <tr key={session.id}>
                <td>{formatDayKey(dayKey(session.startedAt, timeZone))}</td>
                <td className="cell-left">{session.characterName}</td>
                <td className="cell-left">
                  {session.monster}
                  {place ? <small>{place}</small> : null}
                </td>
                <td>
                  {formatTime(session.startedAt, timeZone)} a {formatTime(session.endedAt, timeZone)}
                </td>
                <td>{formatDuration(session.activeMs)}</td>
                <td>
                  {formatInteger(session.mesosEnd)}
                  <small>de {formatInteger(session.mesosStart)}</small>
                </td>
                <td className={profit < 0 ? "text-bad" : "text-good"}>
                  {formatSigned(profit)}
                  {breakdown ? <small>{breakdown}</small> : null}
                </td>
                <td>{formatInteger(perHour(profit, session.activeMs))}</td>
                <td>
                  {levelProgress(session.levelEnd, session.expEnd)}
                  <small>de {levelProgress(session.levelStart, session.expStart)}</small>
                </td>
                <td>{formatInteger(exp)}</td>
                <td>
                  {formatInteger(perHour(exp, session.activeMs))}
                  {recordIds.has(session.id) ? <small className="!text-exp">recorde</small> : null}
                </td>
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
