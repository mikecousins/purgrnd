// Deal terms from Grindr's 8-K filed 2026-09-30 (Agreement and Plan of Merger with PurposeMed).
// https://www.sec.gov/Archives/edgar/data/0001820144/000182014426000033/grnd-20260930.htm
export const TICKER = "GRND";

/** Per-share value of the stock consideration: 15-day VWAP ending 2026-09-29, in USD. */
export const ISSUE_PRICE_USD = 15.58;

export const TOTAL_DEAL_SHARES = 3_851_684;

export const SEC_FILING_URL =
  "https://www.sec.gov/Archives/edgar/data/0001820144/000182014426000033/grnd-20260930.htm";

/** The day the deal closed (YYYY-MM-DD), or null while it's still pending. */
export const CLOSING_DATE: string | null = null;

/**
 * Bank of Canada USD/CAD rate on CLOSING_DATE (CAD per USD), or null while the deal is pending.
 * It fixes each share's Canadian cost base at ISSUE_PRICE_USD × this rate for good.
 * https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates/
 */
export const CLOSING_USD_CAD: number | null = null;

/** The shares are locked up for 12 months after closing. */
export const LOCKUP_MONTHS = 12;

/** The first day the shares can be sold, or null while the deal is pending. */
export function lockupEndDate(): Date | null {
  if (CLOSING_DATE == null) return null;
  const date = new Date(`${CLOSING_DATE}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + LOCKUP_MONTHS);
  return date;
}

export type Position = {
  /** What the shares cost: shares × issue price, converted at the closing rate. */
  costBase: number;
  /** What selling at `price` would bring in, converted at today's rate. */
  proceeds: number;
  gain: number;
  gainPct: number;
  /** The part of the gain from GRND's price moving, valued at today's rate. */
  fromPrice: number;
  /** The part of the gain from the exchange rate moving since closing. */
  fromFx: number;
};

/**
 * A capital gain the way Canada calculates it: each side is converted at the rate on its own day,
 * so the gain moves with the exchange rate as well as with GRND's price. Amounts come out in
 * whatever currency the rates convert to; pass 1 for both to get USD.
 *
 * @param rate today's (or the sale date's) rate
 * @param costRate the rate on the closing date
 */
export function calculatePosition(
  shares: number,
  price: number,
  rate = 1,
  costRate = 1,
): Position {
  const costBase = shares * ISSUE_PRICE_USD * costRate;
  const proceeds = shares * price * rate;
  const gain = proceeds - costBase;
  return {
    costBase,
    proceeds,
    gain,
    gainPct: gain / costBase,
    fromPrice: shares * (price - ISSUE_PRICE_USD) * rate,
    fromFx: shares * ISSUE_PRICE_USD * (rate - costRate),
  };
}
