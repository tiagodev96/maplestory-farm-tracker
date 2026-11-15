"use client";

import { useState } from "react";
import { formatCompact } from "@/lib/format";

export type DailyChartPoint = {
  /** Calendar day, already formatted for display. */
  label: string;
  value: number;
  /** The value as it should be read out (sign, separators). */
  valueText: string;
};

type DailyChartProps = {
  title: string;
  /** Oldest first. */
  points: DailyChartPoint[];
  /** Tailwind background class of the bars; text never takes the series color. */
  barClassName: string;
};

/**
 * One measure per day as thin columns on a zero baseline. Hovering or focusing
 * a day shows its exact value in the header; the per-day table on the same page
 * is the full tabular view of this data.
 */
export function DailyChart({ title, points, barClassName }: DailyChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const highestGain = Math.max(0, ...points.map((point) => point.value));
  const deepestLoss = Math.max(0, ...points.map((point) => -point.value));
  const span = highestGain + deepestLoss || 1;
  const baselineFromTop = (highestGain / span) * 100;
  const shownPoint = points[activeIndex ?? points.length - 1];

  return (
    <figure className="card">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <span className="section-title mb-0">{title}</span>
        <span className="text-sm tabular-nums" aria-live="polite">
          <span className="text-muted">{shownPoint.label}</span>{" "}
          <b className="font-semibold">{shownPoint.valueText}</b>
        </span>
      </figcaption>

      <div className="relative h-36" onMouseLeave={() => setActiveIndex(null)}>
        <span className="absolute left-0 top-0 text-[10px] tabular-nums text-muted">
          {formatCompact(highestGain)}
        </span>
        <div
          className="absolute inset-x-0 h-px bg-line"
          style={{ top: `${baselineFromTop}%` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 flex gap-0.5 pl-9">
          {points.map((point, index) => {
            const share = (Math.abs(point.value) / span) * 100;
            const isLoss = point.value < 0;
            const isDimmed = activeIndex !== null && activeIndex !== index;
            return (
              <button
                key={point.label}
                type="button"
                aria-label={`${point.label}: ${point.valueText}`}
                className="relative h-full min-w-1.5 flex-1 cursor-default focus-visible:outline-2 focus-visible:outline-accent"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
              >
                <span
                  className={`absolute inset-x-0 mx-auto block max-w-6 ${barClassName} ${
                    isLoss ? "rounded-b-[4px]" : "rounded-t-[4px]"
                  } ${isDimmed ? "opacity-50" : ""}`}
                  style={
                    isLoss
                      ? { top: `${baselineFromTop}%`, height: `${share}%` }
                      : { bottom: `${100 - baselineFromTop}%`, height: `${share}%` }
                  }
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-1.5 flex justify-between pl-9 text-[10px] tabular-nums text-muted">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </figure>
  );
}
