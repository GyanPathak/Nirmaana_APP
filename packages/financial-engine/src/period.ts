
export const REPORTING_TIME_ZONE = "Asia/Kolkata";

export interface ReportingPeriod {
  year: number;
  month: number;
  startInclusive: string;
  endExclusive: string;
  timeZone: typeof REPORTING_TIME_ZONE;
}

function validateYearMonth(year: number, month: number): void {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new Error("Year must be an integer between 1900 and 9999");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Month must be an integer between 1 and 12");
  }
}

function istMidnight(
  year: number,
  month: number,
): string {
  const date = new Date(Date.UTC(year, month - 1, 1));

  const localDate = date.toISOString().slice(0, 10);

  return `${localDate}T00:00:00+05:30`;
}

export function getMonthlyPeriod(
  year: number,
  month: number,
): ReportingPeriod {
  validateYearMonth(year, month);

  const nextMonth = new Date(Date.UTC(year, month, 1));

  return {
    year,
    month,
    startInclusive: istMidnight(year, month),
    endExclusive: istMidnight(
      nextMonth.getUTCFullYear(),
      nextMonth.getUTCMonth() + 1,
    ),
    timeZone: REPORTING_TIME_ZONE,
  };
}

export function getPreviousMonthPeriod(
  year: number,
  month: number,
): ReportingPeriod {
  validateYearMonth(year, month);

  const previous = new Date(Date.UTC(year, month - 2, 1));

  return getMonthlyPeriod(
    previous.getUTCFullYear(),
    previous.getUTCMonth() + 1,
  );
}

export function isWithinPeriod(
  timestamp: string,
  period: ReportingPeriod,
): boolean {
  const value = Date.parse(timestamp);
  const start = Date.parse(period.startInclusive);
  const end = Date.parse(period.endExclusive);

  if (!Number.isFinite(value)) {
    throw new Error("Invalid transaction timestamp");
  }

  return value >= start && value < end;
}
