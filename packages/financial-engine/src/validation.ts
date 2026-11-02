
import type {
  Transaction,
  TransactionType,
  TransactionStatus,
  IncomeClassification,
  ExpenseClassification,
} from "./transaction.js";

import { assertValidPaise } from "./money.js";

const VALID_TYPES: TransactionType[] = [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "REFUND",
];

const VALID_STATUSES: TransactionStatus[] = [
  "POSTED",
  "PENDING",
  "FAILED",
  "REVERSED",
];

const VALID_INCOME_CLASSIFICATIONS: IncomeClassification[] = [
  "SALARY",
  "BUSINESS",
  "FREELANCE",
  "INTEREST",
  "DIVIDEND",
  "GIFT",
  "OTHER",
  "LOAN",
  "ASSET_SALE",
];

const VALID_EXPENSE_CLASSIFICATIONS: ExpenseClassification[] = [
  "CONSUMPTION",
  "LOAN_PRINCIPAL",
  "INTEREST",
  "FEE",
  "TAX",
  "OTHER",
];

function isValidDate(value: string): boolean {
  if (!value || Number.isNaN(Date.parse(value))) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTransaction(
  transaction: Transaction,
): ValidationResult {
  const errors: string[] = [];

  if (!transaction.id.trim()) {
    errors.push("Transaction ID is required");
  }

  if (!transaction.userId.trim()) {
    errors.push("User ID is required");
  }

  if (!transaction.accountId.trim()) {
    errors.push("Account ID is required");
  }

  if (!VALID_TYPES.includes(transaction.type)) {
    errors.push("Invalid transaction type");
  }

  if (!VALID_STATUSES.includes(transaction.status)) {
    errors.push("Invalid transaction status");
  }

  try {
    assertValidPaise(transaction.amount);

    if (transaction.amount === 0) {
      errors.push("Transaction amount must be greater than zero");
    }
  } catch {
    errors.push("Transaction amount must be valid paise");
  }

  if (transaction.currency !== "INR") {
    errors.push("Only INR currency is supported");
  }

  if (
    transaction.categoryId !== null &&
    !transaction.categoryId.trim()
  ) {
    errors.push("Category ID cannot be empty");
  }

  if (!isValidDate(transaction.occurredAt)) {
    errors.push("Invalid transaction occurrence date");
  }

  if (
    transaction.postedAt !== null &&
    !isValidDate(transaction.postedAt)
  ) {
    errors.push("Invalid posting date");
  }

  if (
    transaction.status === "POSTED" &&
    transaction.postedAt === null
  ) {
    errors.push("Posted transactions require a posting date");
  }

  if (
    transaction.status === "POSTED" &&
    transaction.postedAt !== null &&
    isValidDate(transaction.postedAt) &&
    isValidDate(transaction.occurredAt) &&
    new Date(transaction.postedAt).getTime() <
      new Date(transaction.occurredAt).getTime()
  ) {
    errors.push("Posting date cannot be before occurrence date");
  }

  if (
    transaction.linkedTransactionId !== null &&
    !transaction.linkedTransactionId.trim()
  ) {
    errors.push("Linked transaction ID cannot be empty");
  }

  if (
    transaction.type === "REFUND" &&
    transaction.linkedTransactionId === null
  ) {
    errors.push("Refunds must link to an original transaction");
  }

  // Income classification validation
  if (
    transaction.type === "INCOME" &&
    transaction.incomeClassification === null
  ) {
    errors.push("Income transactions require an income classification");
  }

  if (
    transaction.incomeClassification !== null &&
    !VALID_INCOME_CLASSIFICATIONS.includes(
      transaction.incomeClassification,
    )
  ) {
    errors.push("Invalid income classification");
  }

  if (
    transaction.type !== "INCOME" &&
    transaction.incomeClassification !== null
  ) {
    errors.push(
      "Only income transactions can have an income classification",
    );
  }

  // Expense classification validation
  if (
    transaction.type === "EXPENSE" &&
    transaction.expenseClassification === null
  ) {
    errors.push("Expense transactions require an expense classification");
  }

  if (
    transaction.expenseClassification !== null &&
    !VALID_EXPENSE_CLASSIFICATIONS.includes(
      transaction.expenseClassification,
    )
  ) {
    errors.push("Invalid expense classification");
  }

  if (
    transaction.type !== "EXPENSE" &&
    transaction.expenseClassification !== null
  ) {
    errors.push(
      "Only expense transactions can have an expense classification",
    );
  }

  // Deduplication key validation
  if (
    transaction.deduplicationKey !== null &&
    !transaction.deduplicationKey.trim()
  ) {
    errors.push("Deduplication key cannot be empty");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
