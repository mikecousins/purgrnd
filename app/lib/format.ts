const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdSigned = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  signDisplay: "exceptZero",
});
const pctSigned = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export const formatUsd = (n: number) => usd.format(n);
export const formatUsdSigned = (n: number) => usdSigned.format(n);
export const formatPctSigned = (n: number) => pctSigned.format(n);
export const formatDate = (d: Date) => date.format(d);
