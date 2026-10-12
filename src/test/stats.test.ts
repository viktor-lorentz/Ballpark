import { describe, expect, it } from "vitest";
import { applyDailyResult, deriveStats } from "../lib/stats";
import { emptyStats } from "../lib/storage";
import type { RoundResult } from "../lib/types";

function round(
  puzzleId: number,
  total: number,
  hits: number,
  durationMs?: number,
  isArchive = false,
): RoundResult {
  return {
    puzzleId,
    dateISO: "2026-10-01",
    total,
    hits,
    results: [],
    isArchive,
    completedAt: 0,
    durationMs,
  };
}

describe("applyDailyResult", () => {
  it("records the first game and starts a streak", () => {
    const s = applyDailyResult(emptyStats, round(1, 600, 4, 90_000));
    expect(s.gamesPlayed).toBe(1);
    expect(s.wins).toBe(1);
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(1);
    expect(s.scores).toEqual([600]);
    expect(s.times).toEqual([90_000]);
  });

  it("extends the streak on consecutive days and tracks max", () => {
    let s = applyDailyResult(emptyStats, round(1, 600, 4));
    s = applyDailyResult(s, round(2, 300, 2)); // not a win, but still a consecutive play
    s = applyDailyResult(s, round(3, 800, 5));
    expect(s.gamesPlayed).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.currentStreak).toBe(3);
    expect(s.maxStreak).toBe(3);
  });

  it("resets the streak after a gap", () => {
    let s = applyDailyResult(emptyStats, round(1, 600, 4));
    s = applyDailyResult(s, round(2, 600, 4));
    s = applyDailyResult(s, round(5, 600, 4)); // skipped days 3 and 4
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(2);
    expect(s.gamesPlayed).toBe(3);
  });

  it("ignores replays of the same day and archive rounds", () => {
    const first = applyDailyResult(emptyStats, round(1, 600, 4));
    expect(applyDailyResult(first, round(1, 999, 5))).toBe(first); // replay today
    expect(applyDailyResult(first, round(2, 999, 5, 1000, true))).toBe(first); // archive
  });
});

describe("deriveStats", () => {
  it("computes win rate, averages and solve times", () => {
    let s = applyDailyResult(emptyStats, round(1, 400, 3, 120_000));
    s = applyDailyResult(s, round(2, 800, 5, 60_000));
    const d = deriveStats(s);
    expect(d.gamesPlayed).toBe(2);
    expect(d.winRate).toBe(100);
    expect(d.average).toBe(600);
    expect(d.best).toBe(800);
    expect(d.bestTimeMs).toBe(60_000);
    expect(d.avgTimeMs).toBe(90_000);
  });

  it("returns null solve times when none are recorded", () => {
    expect(deriveStats(emptyStats).bestTimeMs).toBeNull();
    expect(deriveStats(emptyStats).avgTimeMs).toBeNull();
  });
});
