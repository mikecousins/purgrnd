import { TICKER } from "./deal";

export type Quote = {
  price: number;
  previousClose: number | null;
  /** Epoch ms of the last trade the price reflects. */
  asOf: number;
};

const TIMEOUT_MS = 5_000;

// Yahoo serves the same API from two hosts; the second is a fallback if the first is down or throttled.
const HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];

async function fetchQuote(host: string): Promise<Quote> {
  const res = await fetch(`https://${host}/v8/finance/chart/${TICKER}?interval=1d&range=1d`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; purgrnd/1.0)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${host} responded ${res.status}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (typeof meta?.regularMarketPrice !== "number") throw new Error(`${host}: no price`);
  return {
    price: meta.regularMarketPrice,
    previousClose: meta.chartPreviousClose ?? null,
    asOf: (meta.regularMarketTime ?? Date.now() / 1000) * 1000,
  };
}

export async function getQuote(): Promise<Quote | null> {
  for (const host of HOSTS) {
    try {
      return await fetchQuote(host);
    } catch (error) {
      console.error(`GRND quote via ${host} failed`, error);
    }
  }
  return null;
}
