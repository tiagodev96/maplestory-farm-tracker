import {
  dayKey,
  formatCompact,
  formatDuration,
  formatInteger,
  formatSigned,
  formatSignedCompact,
} from "@/lib/format";
import { aggregate, perHour } from "@/lib/grind-math";
import type { GrindSession } from "../queries";

type StatTilesProps = {
  sessions: GrindSession[];
  now: number;
  timeZone: string;
};

export function StatTiles({ sessions, now, timeZone }: StatTilesProps) {
  const totals = aggregate(sessions);
  const today = dayKey(now, timeZone);
  const todayTotals = aggregate(
    sessions.filter((session) => dayKey(session.startedAt, timeZone) === today),
  );
  const mesosPerHour = perHour(totals.profit, totals.activeMs);
  const expPerHour = perHour(totals.exp, totals.activeMs);

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Tile
        label="Mesos/h"
        value={formatCompact(mesosPerHour)}
        exactValue={formatInteger(mesosPerHour)}
        tone="text-accent"
      />
      <Tile
        label="EXP/h"
        value={formatCompact(expPerHour)}
        exactValue={formatInteger(expPerHour)}
        tone="text-exp"
      />
      <Tile label="Tempo de grind" value={formatDuration(totals.activeMs)} />
      <Tile
        label="Lucro total"
        value={formatSignedCompact(totals.profit)}
        exactValue={formatSigned(totals.profit)}
        tone={totals.profit < 0 ? "text-bad" : "text-accent"}
      />
      <Tile
        label="EXP total"
        value={formatCompact(totals.exp)}
        exactValue={formatInteger(totals.exp)}
        tone="text-exp"
      />
      <Tile
        label="Hoje"
        value={formatSignedCompact(todayTotals.profit)}
        exactValue={`${formatSigned(todayTotals.profit)} mesos`}
        detail={todayTotals.sessionCount > 0 ? formatDuration(todayTotals.activeMs) : "sem grind"}
        tone={todayTotals.profit < 0 ? "text-bad" : ""}
      />
    </dl>
  );
}

type TileProps = {
  label: string;
  value: string;
  /** Full number behind an abbreviated value, shown on hover. */
  exactValue?: string;
  detail?: string;
  tone?: string;
};

function Tile({ label, value, exactValue, detail, tone = "" }: TileProps) {
  return (
    <div className="rounded-xl border border-line bg-panel px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className={`mt-1 text-2xl font-bold leading-tight tabular-nums ${tone}`} title={exactValue}>
        {value || "0"}
        {detail ? <span className="ml-2 text-xs font-normal text-muted">{detail}</span> : null}
      </dd>
    </div>
  );
}
