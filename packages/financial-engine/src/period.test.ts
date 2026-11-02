
import { describe, expect, it } from "vitest";

import {
  getMonthlyPeriod,
  getPreviousMonthPeriod,
  isWithinPeriod,
} from "./period.js";

describe("reporting periods", () => {
  it("creates an October 2026 reporting period", () => {
    const period = getMonthlyPeriod(2026, 10);

    expect(period.startInclusive).toBe(
      "2026-10-01T00:00:00+05:30",
    );

    expect(period.endExclusive).toBe(
      "2026-11-01T00:00:00+05:30",
    );
  });

  it("handles January correctly", () => {
    const period = getMonthlyPeriod(2026, 1);

    expect(period.startInclusive).toBe(
      "2026-01-01T00:00:00+05:30",
    );

    expect(period.endExclusive).toBe(
      "2026-02-01T00:00:00+05:30",
    );
  });

  it("handles leap year February", () => {
    const period = getMonthlyPeriod(2028, 2);

    expect(period.endExclusive).toBe(
      "2028-03-01T00:00:00+05:30",
    );
  });

  it("returns the previous month across a year boundary", () => {
    const period = getPreviousMonthPeriod(2026, 1);

    expect(period.year).toBe(2025);
    expect(period.month).toBe(12);
  });

  it("includes the start boundary", () => {
    const period = getMonthlyPeriod(2026, 10);

    expect(
      isWithinPeriod(period.startInclusive, period),
    ).toBe(true);
  });

  it("excludes the end boundary", () => {
    const period = getMonthlyPeriod(2026, 10);

    expect(
      isWithinPeriod(period.endExclusive, period),
    ).toBe(false);
  });

  it("includes transactions within the period", () => {
    const period = getMonthlyPeriod(2026, 10);

    expect(
      isWithinPeriod("2026-10-15T12:00:00+05:30", period),
    ).toBe(true);
  });

  it("excludes transactions before the period", () => {
    const period = getMonthlyPeriod(2026, 10);

    expect(
      isWithinPeriod("2026-09-30T23:59:59+05:30", period),
    ).toBe(false);
  });

  it("rejects invalid months", () => {
    expect(() => getMonthlyPeriod(2026, 13)).toThrow();
    expect(() => getMonthlyPeriod(2026, 0)).toThrow();
  });

  it("rejects invalid years", () => {
    expect(() => getMonthlyPeriod(1800, 10)).toThrow();
  });

  it("rejects invalid timestamps", () => {
    const period = getMonthlyPeriod(2026, 10);

    expect(() => isWithinPeriod("invalid-date", period)).toThrow();
  });
});
