export const CURRENCIES = ["CAD", "USD"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "CAD";

export function parseCurrency(value: unknown): Currency {
  return CURRENCIES.find((c) => c === value) ?? DEFAULT_CURRENCY;
}
