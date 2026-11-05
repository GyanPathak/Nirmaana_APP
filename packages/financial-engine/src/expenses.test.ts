
import { describe, expect, it } from "vitest";
import type { Transaction } from "./transaction.js";
import { calculateRecordedExpenses } from "./expenses.js";
import { getMonthlyPeriod } from "./period.js";

const userId = "user_001";
const october = getMonthlyPeriod(2026, 10);
const november = getMonthlyPeriod(2026, 11);

function makeExpense(
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: "expense_001",
    userId,
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
    ...overrides,
  };
}

function makeRefund(
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: "refund_001",
    userId,
    type: "REFUND",
    status: "POSTED",
    amount: 5000,
    currency: "INR",
    categoryId: null,
    accountId: "account_001",
    occurredAt: "2026-10-05T10:00:00+05:30",
    postedAt: "2026-10-05T10:05:00+05:30",
    linkedTransactionId: "expense_001",
    description: "Lunch refund",
    incomeClassification: null,
    expenseClassification: null,
    deduplicationKey: null,
    ...overrides,
  };
}

describe("recorded expenses", () => {
  it("includes posted countable expenses", () => {
    const result = calculateRecordedExpenses(
      [makeExpense()],
      userId,
      october,
    );

    expect(result.grossExpensePaise).toBe(15000);
    expect(result.refundsPaise).toBe(0);
    expect(result.totalPaise).toBe(15000);
    expect(result.transactionCount).toBe(1);
  });

  it("excludes loan principal", () => {
    const loanPrincipal = makeExpense({
      id: "loan_001",
      expenseClassification: "LOAN_PRINCIPAL",
    });

    const result = calculateRecordedExpenses(
      [loanPrincipal],
      userId,
      october,
    );

    expect(result.totalPaise).toBe(0);
    expect(result.excludedTransactionIds).toContain("loan_001");
  });

  it("includes interest, fees and taxes as expenses", () => {
    const transactions = [
      makeExpense({
        id: "interest_001",
        amount: 1000,
        expenseClassification: "INTEREST",
      }),
      makeExpense({
        id: "fee_001",
        amount: 2000,
        expenseClassification: "FEE",
      }),
      makeExpense({
        id: "tax_001",
        amount: 3000,
        expenseClassification: "TAX",
      }),
    ];

    const result = calculateRecordedExpenses(
      transactions,
      userId,
      october,
    );

    expect(result.totalPaise).toBe(6000);
  });

  it("subtracts a partial refund from expenses", () => {
    const result = calculateRecordedExpenses(
      [makeExpense(), makeRefund()],
      userId,
      october,
    );

    expect(result.grossExpensePaise).toBe(15000);
    expect(result.refundsPaise).toBe(5000);
    expect(result.totalPaise).toBe(10000);
  });

  it("allows multiple partial refunds within the original amount", () => {
    const firstRefund = makeRefund({
      id: "refund_001",
      amount: 5000,
    });

    const secondRefund = makeRefund({
      id: "refund_002",
      amount: 4000,
      occurredAt: "2026-10-06T10:00:00+05:30",
      postedAt: "2026-10-06T10:05:00+05:30",
    });

    const result = calculateRecordedExpenses(
      [makeExpense(), firstRefund, secondRefund],
      userId,
      october,
    );

    expect(result.refundsPaise).toBe(9000);
    expect(result.totalPaise).toBe(6000);
  });

  it("rejects refunds exceeding the original expense amount", () => {
    const firstRefund = makeRefund({
      id: "refund_001",
      amount: 10000,
    });

    const secondRefund = makeRefund({
      id: "refund_002",
      amount: 6000,
    });

    expect(() =>
      calculateRecordedExpenses(
        [makeExpense(), firstRefund, secondRefund],
        userId,
        october,
      ),
    ).toThrow(/Refunds exceed original expense amount/);
  });

  it("counts refunds in the month received, not the original expense month", () => {
    const originalExpense = makeExpense({
      postedAt: "2026-10-01T10:05:00+05:30",
    });

    const novemberRefund = makeRefund({
      occurredAt: "2026-11-02T10:00:00+05:30",
      postedAt: "2026-11-02T10:05:00+05:30",
    });

    const result = calculateRecordedExpenses(
      [originalExpense, novemberRefund],
      userId,
      november,
    );

    expect(result.grossExpensePaise).toBe(0);
    expect(result.refundsPaise).toBe(5000);
    expect(result.totalPaise).toBe(-5000);
  });

  it("rejects refunds linked to another user's expense", () => {
    const anotherUsersExpense = makeExpense({
      userId: "user_002",
    });

    const refund = makeRefund({
      userId,
      linkedTransactionId: "expense_001",
    });

    expect(() =>
      calculateRecordedExpenses(
        [anotherUsersExpense, refund],
        userId,
        october,
      ),
    ).toThrow(/was not found/);
  });

  it("rejects refunds linked to a loan principal transaction", () => {
    const loanPrincipal = makeExpense({
      expenseClassification: "LOAN_PRINCIPAL",
    });

    expect(() =>
      calculateRecordedExpenses(
        [loanPrincipal, makeRefund()],
        userId,
        october,
      ),
    ).toThrow(/posted, countable expense/);
  });

  it("rejects duplicate eligible deduplication keys", () => {
    const first = makeExpense({
      id: "expense_001",
      deduplicationKey: "bank_txn_123",
    });

    const second = makeExpense({
      id: "expense_002",
      deduplicationKey: "bank_txn_123",
    });

    expect(() =>
      calculateRecordedExpenses(
        [first, second],
        userId,
        october,
      ),
    ).toThrow(/Duplicate expense or refund transaction detected/);
  });

  it("excludes pending, failed and reversed expenses", () => {
    const transactions = [
      makeExpense({
        id: "pending_001",
        status: "PENDING",
        postedAt: null,
      }),
      makeExpense({
        id: "failed_001",
        status: "FAILED",
        postedAt: null,
      }),
      makeExpense({
        id: "reversed_001",
        status: "REVERSED",
        postedAt: null,
      }),
    ];

    const result = calculateRecordedExpenses(
      transactions,
      userId,
      october,
    );

    expect(result.totalPaise).toBe(0);
    expect(result.includedTransactionIds).toHaveLength(0);
    expect(result.excludedTransactionIds).toHaveLength(3);
  });

  it("excludes transactions outside the reporting period", () => {
    const expense = makeExpense({
      postedAt: "2026-11-01T10:05:00+05:30",
      occurredAt: "2026-11-01T10:00:00+05:30",
    });

    const result = calculateRecordedExpenses(
      [expense],
      userId,
      october,
    );

    expect(result.totalPaise).toBe(0);
    expect(result.excludedTransactionIds).toContain("expense_001");
  });

  it("does not include another user's transactions", () => {
    const otherUsersExpense = makeExpense({
      id: "other_user_expense",
      userId: "user_002",
    });

    const result = calculateRecordedExpenses(
      [makeExpense(), otherUsersExpense],
      userId,
      october,
    );

    expect(result.totalPaise).toBe(15000);
    expect(result.includedTransactionIds).toEqual(["expense_001"]);
    expect(result.excludedTransactionIds).toEqual([]);
  });
});
