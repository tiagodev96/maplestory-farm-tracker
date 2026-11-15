import { describe, expect, it } from "vitest";
import { expGained, isValidLevel, levelProgressPercent } from "./exp-table";
import {
  dayKey,
  formatClock,
  formatCompact,
  formatDuration,
  formatSignedCompact,
  parseAmount,
  formatInteger,
  formatSigned,
  formatTime,
  parseInteger,
  toDateTimeLocal,
} from "./format";
import {
  aggregate,
  elapsedActiveMs,
  groupTotals,
  perHour,
  totalPausedMs,
  type SessionMetrics,
} from "./grind-math";

const MINUTE = 60_000;

// The three sessions that shipped as seed data in the original single-file tracker.
const wraithsMorning: SessionMetrics = {
  activeMs: 49 * MINUTE,
  mesosStart: 2_583_000,
  mesosEnd: 2_616_000,
  levelStart: 53,
  expStart: 4_453,
  levelEnd: 53,
  expEnd: 145_463,
};
const lupins: SessionMetrics = {
  activeMs: 64 * MINUTE,
  mesosStart: 2_616_000,
  mesosEnd: 2_634_000,
  levelStart: 53,
  expStart: 145_463,
  levelEnd: 53,
  expEnd: 251_223,
};
const wraithsAfternoon: SessionMetrics = {
  activeMs: 156 * MINUTE,
  mesosStart: 2_634_314,
  mesosEnd: 2_692_279,
  levelStart: 53,
  expStart: 251_223,
  levelEnd: 53,
  expEnd: 605_695,
};

describe("expGained", () => {
  it("subtracts within the same level", () => {
    expect(expGained(wraithsMorning)).toBe(141_010);
  });

  it("adds the rest of the level when the character levels up", () => {
    const progress = { levelStart: 10, expStart: 1_000, levelEnd: 11, expEnd: 100 };
    expect(expGained(progress)).toBe(1_716 - 1_000 + 100);
  });

  it("is negative when EXP was lost to a death", () => {
    const progress = { levelStart: 53, expStart: 5_000, levelEnd: 53, expEnd: 4_000 };
    expect(expGained(progress)).toBe(-1_000);
  });

  it("returns null for a level outside the table", () => {
    const progress = { levelStart: 0, expStart: 0, levelEnd: 101, expEnd: 0 };
    expect(expGained(progress)).toBeNull();
  });
});

describe("level helpers", () => {
  it("accepts levels 1 to 100 only", () => {
    expect(isValidLevel(1)).toBe(true);
    expect(isValidLevel(100)).toBe(true);
    expect(isValidLevel(0)).toBe(false);
    expect(isValidLevel(101)).toBe(false);
    expect(isValidLevel(null)).toBe(false);
  });

  it("computes progress through a level and has none at the cap", () => {
    expect(levelProgressPercent(1, 7.5)).toBe(50);
    expect(levelProgressPercent(100, 0)).toBeNull();
  });
});

describe("rates and totals", () => {
  it("scales a value to one hour", () => {
    expect(perHour(100, 30 * MINUTE)).toBe(200);
    expect(perHour(100, 0)).toBeNull();
    expect(perHour(null, MINUTE)).toBeNull();
  });

  it("sums time, profit and EXP across sessions", () => {
    const totals = aggregate([wraithsMorning, lupins, wraithsAfternoon]);
    expect(totals).toEqual({
      sessionCount: 3,
      activeMs: 269 * MINUTE,
      profit: 33_000 + 18_000 + 57_965,
      exp: 141_010 + 105_760 + 354_472,
    });
  });

  it("groups sessions by a key", () => {
    const tagged = [
      { ...wraithsMorning, monster: "Wraiths" },
      { ...lupins, monster: "Lupin" },
      { ...wraithsAfternoon, monster: "Wraiths" },
    ];
    const groups = groupTotals(tagged, (session) => session.monster);
    expect(groups.map((group) => [group.key, group.totals.sessionCount])).toEqual([
      ["Wraiths", 2],
      ["Lupin", 1],
    ]);
  });
});

describe("grind timer", () => {
  const startedAt = 1_000_000;

  it("counts time since the start while running", () => {
    const timer = { startedAt, pausedMs: 0, pauseStartedAt: null };
    expect(elapsedActiveMs(timer, startedAt + 5 * MINUTE)).toBe(5 * MINUTE);
  });

  it("excludes finished pauses and freezes during the current one", () => {
    const timer = {
      startedAt,
      pausedMs: 2 * MINUTE,
      pauseStartedAt: startedAt + 10 * MINUTE,
    };
    const now = startedAt + 30 * MINUTE;
    expect(elapsedActiveMs(timer, now)).toBe(8 * MINUTE);
    expect(totalPausedMs(timer, now)).toBe(22 * MINUTE);
  });
});

describe("number formatting", () => {
  it("formats integers the pt-BR way", () => {
    expect(formatInteger(2_583_000)).toBe("2.583.000");
    expect(formatInteger(null)).toBe("");
    expect(formatSigned(33_000)).toBe("+33.000");
    expect(formatSigned(-500)).toBe("-500");
  });

  it("parses what the formatter produces", () => {
    expect(parseInteger("2.583.000")).toBe(2_583_000);
    expect(parseInteger("-500")).toBe(-500);
    expect(parseInteger("")).toBeNull();
    expect(parseInteger("abc")).toBeNull();
  });

  it("expands the k and m shorthand", () => {
    expect(parseAmount("350k")).toBe(350_000);
    expect(parseAmount("1,2m")).toBe(1_200_000);
    expect(parseAmount("1.5M")).toBe(1_500_000);
    expect(parseAmount("1.500k")).toBe(1_500_000);
    expect(parseAmount("2 m")).toBe(2_000_000);
    expect(parseAmount("2.583.000")).toBe(2_583_000);
    expect(parseAmount("k")).toBeNull();
  });

  it("abbreviates large values and keeps small ones exact", () => {
    expect(formatCompact(9_999)).toBe("9.999");
    expect(formatCompact(46_360)).toBe("46,4k");
    expect(formatCompact(350_000)).toBe("350k");
    expect(formatCompact(1_240_512)).toBe("1,24M");
    expect(formatCompact(999_950)).toBe("1M");
    expect(formatCompact(2_150_150_011)).toBe("2,15B");
    expect(formatSignedCompact(207_965)).toBe("+208k");
    expect(formatSignedCompact(-57_965)).toBe("-58k");
  });

  it("formats durations", () => {
    expect(formatClock(3_725_000)).toBe("01:02:05");
    expect(formatDuration(49 * MINUTE)).toBe("49 min");
    expect(formatDuration(156 * MINUTE)).toBe("2h 36min");
  });
});

describe("time zone aware dates", () => {
  const lateEveningInSaoPaulo = Date.UTC(2026, 10, 15, 1, 30);

  it("assigns a timestamp to the local calendar day, not the UTC one", () => {
    expect(dayKey(lateEveningInSaoPaulo, "America/Sao_Paulo")).toBe("2026-11-14");
    expect(dayKey(lateEveningInSaoPaulo, "UTC")).toBe("2026-11-15");
  });

  it("formats local time and datetime-local values", () => {
    expect(formatTime(lateEveningInSaoPaulo, "America/Sao_Paulo")).toBe("22:30");
    expect(toDateTimeLocal(lateEveningInSaoPaulo, "America/Sao_Paulo")).toBe(
      "2026-11-14T22:30",
    );
  });
});
