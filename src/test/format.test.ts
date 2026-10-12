import { describe, expect, it } from "vitest";
import { formatDuration, formatNumber, formatValue } from "../lib/format";

describe("formatDuration", () => {
  it("formats milliseconds as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5000)).toBe("0:05");
    expect(formatDuration(65000)).toBe("1:05");
    expect(formatDuration(128000)).toBe("2:08");
  });

  it("never goes negative", () => {
    expect(formatDuration(-1000)).toBe("0:00");
  });
});

describe("formatNumber", () => {
  it("adds thousands separators and compacts large numbers", () => {
    expect(formatNumber(7000)).toBe("7,000");
    expect(formatNumber(1_300_000_000)).toBe("1.3B");
    expect(formatNumber(206)).toBe("206");
  });
});

describe("formatValue", () => {
  it("appends units sensibly", () => {
    expect(formatValue(7000, "m")).toBe("7,000 m");
    expect(formatValue(63, "%")).toBe("63%");
    expect(formatValue(206, "")).toBe("206");
  });
});
