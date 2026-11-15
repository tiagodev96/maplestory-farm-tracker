import { levelProgressPercent } from "@/lib/exp-table";
import { formatPercent } from "@/lib/format";

export function LevelBar({ level, exp }: { level: number; exp: number }) {
  const percent = levelProgressPercent(level, exp);
  const filledPercent = Math.min(100, Math.max(0, percent ?? 100));

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold">Lv {level}</span>
        <span className="tabular-nums text-muted">{formatPercent(percent)}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={`Progresso do level ${level}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(filledPercent)}
      >
        <div className="h-full rounded-full bg-expbar" style={{ width: `${filledPercent}%` }} />
      </div>
    </div>
  );
}
