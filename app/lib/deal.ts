// Deal terms from Grindr's 8-K filed 2026-09-30 (Agreement and Plan of Merger with PurposeMed).
// https://www.sec.gov/Archives/edgar/data/0001820144/000182014426000033/grnd-20260930.htm
export const TICKER = "GRND";

/** Per-share value of the stock consideration: 15-day VWAP ending 2026-09-29, in USD. */
export const ISSUE_PRICE_USD = 15.58;

export const TOTAL_DEAL_SHARES = 3_851_684;

export const LOCKUP_MONTHS = 12;

/**
 * Set this to the closing date (YYYY-MM-DD) once the deal closes so the app can
 * count down to the end of the lockup. Expected Q4 2026.
 */
export const CLOSING_DATE: string | null = null;

export const SEC_FILING_URL =
  "https://www.sec.gov/Archives/edgar/data/0001820144/000182014426000033/grnd-20260930.htm";

export type Position = {
  originalValue: number;
  currentValue: number;
  gain: number;
  gainPct: number;
};

export function calculatePosition(shares: number, price: number): Position {
  const originalValue = shares * ISSUE_PRICE_USD;
  const currentValue = shares * price;
  const gain = currentValue - originalValue;
  return {
    originalValue,
    currentValue,
    gain,
    gainPct: (price - ISSUE_PRICE_USD) / ISSUE_PRICE_USD,
  };
}

export type Lockup = {
  closing: Date;
  end: Date;
  daysRemaining: number;
  fractionElapsed: number;
};

export function getLockup(now: Date, closingDate = CLOSING_DATE): Lockup | null {
  if (!closingDate) return null;
  const closing = new Date(`${closingDate}T00:00:00Z`);
  const end = new Date(closing);
  end.setUTCMonth(end.getUTCMonth() + LOCKUP_MONTHS);
  const total = end.getTime() - closing.getTime();
  const elapsed = Math.min(Math.max(now.getTime() - closing.getTime(), 0), total);
  return {
    closing,
    end,
    daysRemaining: Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000)),
    fractionElapsed: elapsed / total,
  };
}
