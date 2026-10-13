import type { Currency } from "./currency";

// en-CA writes CAD as "$" and USD as "US$", so the two currencies can't be mistaken for each other.
const moneyFormat = (currency: Currency, signed: boolean) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    signDisplay: signed ? "exceptZero" : "auto",
  });
const money = {
  CAD: moneyFormat("CAD", false),
  USD: moneyFormat("USD", false),
};
const moneySigned = {
  CAD: moneyFormat("CAD", true),
  USD: moneyFormat("USD", true),
};
const rate = new Intl.NumberFormat("en-CA", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const pctSigned = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export const formatMoney = (n: number, currency: Currency, signed = false) =>
  (signed ? moneySigned : money)[currency].format(n);
export const formatRate = (n: number) => rate.format(n);
export const formatPctSigned = (n: number) => pctSigned.format(n);
export const formatDate = (d: Date) => date.format(d);
