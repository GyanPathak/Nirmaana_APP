export type Paise = number;

export function rupeesToPaise(rupees: number): Paise {
  if (!Number.isFinite(rupees)) {
    throw new Error("Amount must be a finite number");
  }

  if (rupees < 0) {
    throw new Error("Amount cannot be negative");
  }

  const paise = rupees * 100;

  if (!Number.isSafeInteger(Math.round(paise))) {
    throw new Error("Amount exceeds the safe monetary range");
  }

  if (Math.abs(paise - Math.round(paise)) > 1e-7) {
    throw new Error("Amount cannot have fractions smaller than one paise");
  }

  return Math.round(paise);
}

export function addPaise(a: Paise, b: Paise): Paise {
  assertValidPaise(a);
  assertValidPaise(b);

  const result = a + b;

  if (!Number.isSafeInteger(result)) {
    throw new Error("Monetary addition exceeds the safe integer range");
  }

  return result;
}

export function assertValidPaise(value: number): asserts value is Paise {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Paise must be a non-negative safe integer");
  }
}
