import { describe, expect, it } from "vitest";
import {
  addPaise,
  assertValidPaise,
  rupeesToPaise,
} from "./money.js";

describe("money utilities", () => {
  it("converts rupees to paise", () => {
    expect(rupeesToPaise(125.5)).toBe(12550);
    expect(rupeesToPaise(0)).toBe(0);
  });

  it("adds paise safely", () => {
    expect(addPaise(12550, 450)).toBe(13000);
  });

  it("rejects negative monetary amounts", () => {
    expect(() => rupeesToPaise(-1)).toThrow();
    expect(() => assertValidPaise(-100)).toThrow();
  });

  it("rejects invalid paise values", () => {
    expect(() => assertValidPaise(1.5)).toThrow();
    expect(() => assertValidPaise(Number.NaN)).toThrow();
  });

  it("rejects unsafe addition results", () => {
    expect(() =>
      addPaise(Number.MAX_SAFE_INTEGER, 1),
    ).toThrow();
  });

  it("rejects amounts that cannot be represented in whole paise", () => {
    expect(() => rupeesToPaise(1.001)).toThrow();
  });
});
