
import type { Paise } from "./money.js";

export type TransactionType =
  | "INCOME"
  | "EXPENSE"
  | "TRANSFER"
  | "REFUND";

export type TransactionStatus =
  | "POSTED"
  | "PENDING"
  | "FAILED"
  | "REVERSED";

export type Currency = "INR";

export type IncomeClassification =
  | "SALARY"
  | "BUSINESS"
  | "FREELANCE"
  | "INTEREST"
  | "DIVIDEND"
  | "GIFT"
  | "OTHER"
  | "LOAN"
  | "ASSET_SALE";

export type ExpenseClassification =
  | "CONSUMPTION"
  | "LOAN_PRINCIPAL"
  | "INTEREST"
  | "FEE"
  | "TAX"
  | "OTHER";

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: Paise;
  currency: Currency;
  categoryId: string | null;
  accountId: string;
  occurredAt: string;
  postedAt: string | null;
  linkedTransactionId: string | null;
  description: string | null;
  expenseClassification: ExpenseClassification | null;

  // Required for INCOME transactions; null for other types.
  incomeClassification: IncomeClassification | null;

  // Stable key assigned during import or ingestion.
  // Identical non-null keys identify potential duplicate records.
  deduplicationKey: string | null;
}


