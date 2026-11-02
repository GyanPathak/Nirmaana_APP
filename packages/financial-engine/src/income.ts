
import type { Transaction } from "./transaction.js";
import type { ReportingPeriod } from "./period.js";

import { addPaise } from "./money.js";
import { validateTransaction } from "./validation.js";
import { isWithinPeriod } from "./period.js";

export interface RecordedIncomeResult {
  userId: string;
  totalPaise: number;
  transactionCount: number;
  includedTransactionIds: string[];
  excludedTransactionIds: string[];
  period: ReportingPeriod;
}

const COUNTABLE_INCOME_CLASSIFICATIONS = new Set([
  "SALARY",
  "BUSINESS",
  "FREELANCE",
  "INTEREST",
  "DIVIDEND",
  "GIFT",
  "OTHER",
]);

export function calculateRecordedIncome(
  transactions: Transaction[],
  userId: string,
  period: ReportingPeriod,
): RecordedIncomeResult {
  if (!userId.trim()) {
    throw new Error("User ID is required");
  }

  const userTransactions = transactions.filter(
    (transaction) => transaction.userId === userId,
  );

  let totalPaise = 0;
  const includedTransactionIds: string[] = [];
  const excludedTransactionIds: string[] = [];
  const seenDeduplicationKeys = new Set<string>();

  for (const transaction of userTransactions) {
    const validation = validateTransaction(transaction);

    if (!validation.valid) {
      throw new Error(
        `Invalid transaction ${transaction.id}: ${validation.errors.join("; ")}`,
      );
    }

    const isEligibleIncome =
      transaction.type === "INCOME" &&
      transaction.status === "POSTED" &&
      transaction.postedAt !== null &&
      transaction.incomeClassification !== null &&
      COUNTABLE_INCOME_CLASSIFICATIONS.has(
        transaction.incomeClassification,
      ) &&
      isWithinPeriod(transaction.postedAt, period);

    if (!isEligibleIncome) {
      excludedTransactionIds.push(transaction.id);
      continue;
    }

    if (transaction.deduplicationKey !== null) {
      if (seenDeduplicationKeys.has(transaction.deduplicationKey)) {
        throw new Error(
          `Duplicate income transaction detected: ${transaction.deduplicationKey}`,
        );
      }

      seenDeduplicationKeys.add(transaction.deduplicationKey);
    }

    totalPaise = addPaise(totalPaise, transaction.amount);
    includedTransactionIds.push(transaction.id);
  }

  return {
    userId,
    totalPaise,
    transactionCount: includedTransactionIds.length,
    includedTransactionIds,
    excludedTransactionIds,
    period,
  };
}
