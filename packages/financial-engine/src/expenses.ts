
import type { Transaction } from "./transaction.js";
import type { ReportingPeriod } from "./period.js";

import { addPaise } from "./money.js";
import { validateTransaction } from "./validation.js";
import { isWithinPeriod } from "./period.js";

export interface RecordedExpensesResult {
  userId: string;
  totalPaise: number;
  grossExpensePaise: number;
  refundsPaise: number;
  transactionCount: number;
  includedTransactionIds: string[];
  excludedTransactionIds: string[];
  period: ReportingPeriod;
}

const COUNTABLE_EXPENSE_CLASSIFICATIONS = new Set([
  "CONSUMPTION",
  "INTEREST",
  "FEE",
  "TAX",
  "OTHER",
]);

export function calculateRecordedExpenses(
  transactions: Transaction[],
  userId: string,
  period: ReportingPeriod,
): RecordedExpensesResult {
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const userTransactions = transactions.filter(
    (transaction) => transaction.userId === userId,
  );

  // Validate transactions and ensure their IDs are unique.
  const transactionsById = new Map<string, Transaction>();

  for (const transaction of userTransactions) {
    const validation = validateTransaction(transaction);

    if (!validation.valid) {
      throw new Error(
        `Invalid transaction ${transaction.id}: ${validation.errors.join("; ")}`,
      );
    }

    if (transactionsById.has(transaction.id)) {
      throw new Error(
        `Duplicate transaction ID detected: ${transaction.id}`,
      );
    }

    transactionsById.set(transaction.id, transaction);
  }

  // Validate every refund's relationship to its original expense.
  // Track posted refunds across the supplied history to prevent
  // cumulative refunds from exceeding the original expense.
  const refundedAmounts = new Map<string, number>();

  for (const transaction of userTransactions) {
    if (transaction.type !== "REFUND") {
      continue;
    }

    const originalId = transaction.linkedTransactionId;

    if (originalId === null) {
      throw new Error(
        `Refund ${transaction.id} has no linked original transaction`,
      );
    }

    const original = transactionsById.get(originalId);

    if (!original) {
      throw new Error(
        `Original transaction ${originalId} for refund ${transaction.id} was not found`,
      );
    }

    if (
      original.type !== "EXPENSE" ||
      original.status !== "POSTED" ||
      original.expenseClassification === null ||
      !COUNTABLE_EXPENSE_CLASSIFICATIONS.has(
        original.expenseClassification,
      )
    ) {
      throw new Error(
        `Refund ${transaction.id} must link to a posted, countable expense`,
      );
    }

    if (
      transaction.status === "POSTED" &&
      transaction.postedAt !== null &&
      original.postedAt !== null &&
      new Date(transaction.postedAt).getTime() <
        new Date(original.postedAt).getTime()
    ) {
      throw new Error(
        `Refund ${transaction.id} cannot be posted before its original expense`,
      );
    }

    if (transaction.status === "POSTED") {
      const previousRefunds = refundedAmounts.get(originalId) ?? 0;
      const newRefundTotal = addPaise(
        previousRefunds,
        transaction.amount,
      );

      if (newRefundTotal > original.amount) {
        throw new Error(
          `Refunds exceed original expense amount for transaction ${originalId}`,
        );
      }

      refundedAmounts.set(originalId, newRefundTotal);
    }
  }

  let grossExpensePaise = 0;
  let refundsPaise = 0;

  const includedTransactionIds: string[] = [];
  const excludedTransactionIds: string[] = [];
  const seenDeduplicationKeys = new Set<string>();

  for (const transaction of userTransactions) {
    const isEligibleExpense =
      transaction.type === "EXPENSE" &&
      transaction.status === "POSTED" &&
      transaction.postedAt !== null &&
      transaction.expenseClassification !== null &&
      COUNTABLE_EXPENSE_CLASSIFICATIONS.has(
        transaction.expenseClassification,
      ) &&
      isWithinPeriod(transaction.postedAt, period);

    const isEligibleRefund =
      transaction.type === "REFUND" &&
      transaction.status === "POSTED" &&
      transaction.postedAt !== null &&
      isWithinPeriod(transaction.postedAt, period);

    if (!isEligibleExpense && !isEligibleRefund) {
      excludedTransactionIds.push(transaction.id);
      continue;
    }

    if (transaction.deduplicationKey !== null) {
      if (seenDeduplicationKeys.has(transaction.deduplicationKey)) {
        throw new Error(
          `Duplicate expense or refund transaction detected: ${transaction.deduplicationKey}`,
        );
      }

      seenDeduplicationKeys.add(transaction.deduplicationKey);
    }

    if (isEligibleExpense) {
      grossExpensePaise = addPaise(
        grossExpensePaise,
        transaction.amount,
      );
    } else {
      refundsPaise = addPaise(refundsPaise, transaction.amount);
    }

    includedTransactionIds.push(transaction.id);
  }


  return {
    userId,
    totalPaise: grossExpensePaise - refundsPaise,
    grossExpensePaise,
    refundsPaise,
    transactionCount: includedTransactionIds.length,
    includedTransactionIds,
    excludedTransactionIds,
    period,
  };
}
