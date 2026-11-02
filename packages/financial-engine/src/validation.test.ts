
import { describe, expect, it } from "vitest";
import { validateTransaction } from "./validation.js";
import type { Transaction } from "./transaction.js";

const validTransaction: Transaction = {
  id: "txn_001",
  userId: "user_001",
  type: "EXPENSE",
  status: "POSTED",
  amount: 15000,
  currency: "INR",
  categoryId: "food",
  accountId: "account_001",
  occurredAt: "2026-10-01T10:00:00+05:30",
  postedAt: "2026-10-01T10:05:00+05:30",
  linkedTransactionId: null,
  description: "Lunch",
  incomeClassification: null,
  expenseClassification: "CONSUMPTION",
  deduplicationKey: null,
  
};

describe("transaction validation", () => {
  it("accepts a valid transaction", () => {
    expect(validateTransaction(validTransaction).valid).toBe(true);
  });

  it("rejects an empty transaction ID", () => {
    const result = validateTransaction({
      ...validTransaction,
      id: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Transaction ID is required");
  });

  it("rejects invalid amounts", () => {
    const result = validateTransaction({
      ...validTransaction,
      amount: -100,
    });

    expect(result.valid).toBe(false);
  });

  it("rejects zero amounts", () => {
    const result = validateTransaction({
      ...validTransaction,
      amount: 0,
    });

    expect(result.valid).toBe(false);
  });

  it("rejects unsupported currencies", () => {
    const result = validateTransaction({
      ...validTransaction,
      currency: "USD" as "INR",
    });

    expect(result.valid).toBe(false);
  });

  it("rejects invalid occurrence dates", () => {
    const result = validateTransaction({
      ...validTransaction,
      occurredAt: "not-a-date",
    });

    expect(result.valid).toBe(false);
  });

  it("requires a posting date for posted transactions", () => {
    const result = validateTransaction({
      ...validTransaction,
      postedAt: null,
    });

    expect(result.valid).toBe(false);
  });

  it("rejects posting dates before occurrence dates", () => {
    const result = validateTransaction({
      ...validTransaction,
      occurredAt: "2026-10-02T10:00:00+05:30",
      postedAt: "2026-10-01T10:00:00+05:30",
    });

    expect(result.valid).toBe(false);
  });

  it("requires refunds to link to an original transaction", () => {
    const result = validateTransaction({
      ...validTransaction,
      type: "REFUND",
      linkedTransactionId: null,
    });

    expect(result.valid).toBe(false);
  });

  it("accepts a refund linked to an original transaction", () => {
    const result = validateTransaction({
      ...validTransaction,
      type: "REFUND",
      expenseClassification: null,
      linkedTransactionId: "txn_original",
    });

    expect(result.valid).toBe(true);
  });

  it("returns multiple errors for invalid transactions", () => {
    const result = validateTransaction({
      ...validTransaction,
      id: "",
      userId: "",
      amount: -100,
      occurredAt: "invalid",
    });

    expect(result.errors.length).toBeGreaterThan(1);
  });
});
