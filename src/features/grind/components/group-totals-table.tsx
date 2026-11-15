import { formatDuration, formatInteger, formatSigned } from "@/lib/format";
import { perHour, type Totals } from "@/lib/grind-math";

export type TotalsRow = { label: string; totals: Totals };

const mesosPerHour = (row: TotalsRow) => perHour(row.totals.profit, row.totals.activeMs);
const expPerHour = (row: TotalsRow) => perHour(row.totals.exp, row.totals.activeMs);

function highest(rows: TotalsRow[], rateOf: (row: TotalsRow) => number | null): number {
  return Math.max(0, ...rows.map((row) => rateOf(row) ?? 0));
}

export function GroupTotalsTable({ heading, rows }: { heading: string; rows: TotalsRow[] }) {
  const highestMesosPerHour = highest(rows, mesosPerHour);
  const highestExpPerHour = highest(rows, expPerHour);

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>{heading}</th>
            <th>Sessões</th>
            <th>Tempo</th>
            <th>Lucro</th>
            <th>Mesos/h</th>
            <th>EXP ganho</th>
            <th>EXP/h</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.totals.sessionCount}</td>
              <td>{formatDuration(row.totals.activeMs)}</td>
              <td className={row.totals.profit < 0 ? "text-bad" : "text-good"}>
                {formatSigned(row.totals.profit)}
              </td>
              <RateCell rate={mesosPerHour(row)} highest={highestMesosPerHour} barTone="bg-accent" />
              <td>{formatInteger(row.totals.exp)}</td>
              <RateCell rate={expPerHour(row)} highest={highestExpPerHour} barTone="bg-exp" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A rate with a bar scaled against the best row, so the best spot stands out at a glance. */
function RateCell({
  rate,
  highest,
  barTone,
}: {
  rate: number | null;
  highest: number;
  barTone: string;
}) {
  const share = rate !== null && highest > 0 ? Math.max(0, rate / highest) : 0;

  return (
    <td className="min-w-[110px]">
      {formatInteger(rate)}
      <div className="mt-1 h-1 rounded-full bg-line" aria-hidden="true">
        <div className={`ml-auto h-full rounded-full ${barTone}`} style={{ width: `${share * 100}%` }} />
      </div>
    </td>
  );
}
