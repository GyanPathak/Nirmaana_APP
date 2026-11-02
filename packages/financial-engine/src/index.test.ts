import { describe, expect, it } from "vitest";
import { FINANCIAL_ENGINE_VERSION } from "./index.js";

describe("financial engine", () => {
  it("exposes the expected version", () => {
    expect(FINANCIAL_ENGINE_VERSION).toBe("0.1.0");
  });
});
