import type { Currency } from "./currency";

// en-CA writes CAD as "$" and USD as "US$", so the two currencies can't be mistaken for each other.
const moneyFormat = (currency: Currency, signed: boolean, whole = false) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    signDisplay: signed ? "exceptZero" : "auto",
    ...(whole && { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  });
const money = {
  CAD: moneyFormat("CAD", false),
  USD: moneyFormat("USD", false),
};
const moneySigned = {
  CAD: moneyFormat("CAD", true),
  USD: moneyFormat("USD", true),
};
const wholeMoney = {
  CAD: moneyFormat("CAD", false, true),
  USD: moneyFormat("USD", false, true),
};
const wholeMoneySigned = {
  CAD: moneyFormat("CAD", true, true),
  USD: moneyFormat("USD", true, true),
};
const rate = new Intl.NumberFormat("en-CA", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const pctSigned = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const date = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const shareCount = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 });
const asOf = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
  timeZoneName: "short",
});

export const formatMoney = (n: number, currency: Currency, signed = false) =>
  (signed ? moneySigned : money)[currency].format(n);
/** Rounded to the dollar, for the big totals. */
export const formatMoneyWhole = (n: number, currency: Currency, signed = false) =>
  (signed ? wholeMoneySigned : wholeMoney)[currency].format(n);
export const formatRate = (n: number) => rate.format(n);
export const formatPctSigned = (n: number) => pctSigned.format(n);
export const formatShares = (n: number) => shareCount.format(n);
export const formatAsOf = (epochMs: number) => asOf.format(epochMs);
export const formatDate = (d: Date) => date.format(d);
/** Time left as "352d 04:12:09". */
export const formatCountdown = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const days = Math.floor(total / 86_400);
  const clock = `${pad(Math.floor(total / 3600) % 24)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
};
