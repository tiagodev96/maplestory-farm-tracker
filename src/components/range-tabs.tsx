import Link from "next/link";
import {
  DEFAULT_SESSION_RANGE,
  hrefWithParams,
  SESSION_RANGES,
  type SessionRangeKey,
} from "@/lib/session-range";

type RangeTabsProps = {
  pathname: string;
  current: SessionRangeKey;
  /** Other query parameters to keep when switching the period. */
  otherParams?: Record<string, string | null>;
};

export function RangeTabs({ pathname, current, otherParams = {} }: RangeTabsProps) {
  return (
    <nav aria-label="Período" className="flex gap-1">
      {SESSION_RANGES.map((range) => (
        <Link
          key={range.key}
          href={hrefWithParams(pathname, {
            ...otherParams,
            range: range.key === DEFAULT_SESSION_RANGE ? null : range.key,
          })}
          aria-current={range.key === current ? "page" : undefined}
          className="tab"
        >
          {range.label}
        </Link>
      ))}
    </nav>
  );
}
