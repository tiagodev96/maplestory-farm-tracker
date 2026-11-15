import { formatDuration, formatInteger, formatSigned } from "@/lib/format";
import { isReliableDuration, perHour, type Totals } from "@/lib/grind-math";

export type TotalsRow = {
  label: string;
  totals: Totals;
  /** Best single-session EXP/h of the group, when the view tracks records. */
  bestExpPerHour?: number | null;
};

const profitPerHour = (row: TotalsRow) => perHour(row.totals.profit, row.totals.activeMs);
const expPerHour = (row: TotalsRow) => perHour(row.totals.exp, row.totals.activeMs);

/** Scale for the bars. Rows with too little grind time would dwarf every real rate. */
function highest(rows: TotalsRow[], rateOf: (row: TotalsRow) => number | null): number {
  const reliableRows = rows.filter((row) => isReliableDuration(row.totals.activeMs));
  return Math.max(0, ...reliableRows.map((row) => rateOf(row) ?? 0));
}

type GroupTotalsTableProps = {
  heading: string;
  rows: TotalsRow[];
  showsRecord?: boolean;
};

export function GroupTotalsTable({ heading, rows, showsRecord = false }: GroupTotalsTableProps) {
  const highestProfitPerHour = highest(rows, profitPerHour);
  const highestExpPerHour = highest(rows, expPerHour);

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>{heading}</th>
            <th>Sessões</th>
            <th>Tempo</th>
            <th>Lucro líq.</th>
            <th>Lucro/h</th>
            <th>EXP ganho</th>
            <th>EXP/h</th>
            {showsRecord ? <th>Recorde EXP/h</th> : null}
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
              <RateCell rate={profitPerHour(row)} highest={highestProfitPerHour} barTone="bg-accent" />
              <td>{formatInteger(row.totals.exp)}</td>
              <RateCell rate={expPerHour(row)} highest={highestExpPerHour} barTone="bg-exp" />
              {showsRecord ? <td>{formatInteger(row.bestExpPerHour ?? null) || "–"}</td> : null}
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
  const share = rate !== null && highest > 0 ? Math.min(1, Math.max(0, rate / highest)) : 0;

  return (
    <td className="min-w-[110px]">
      {formatInteger(rate)}
      <div className="mt-1 h-1 rounded-full bg-line" aria-hidden="true">
        <div className={`ml-auto h-full rounded-full ${barTone}`} style={{ width: `${share * 100}%` }} />
      </div>
    </td>
  );
}
