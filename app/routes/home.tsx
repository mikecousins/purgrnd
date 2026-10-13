import { Slider } from "@base-ui/react/slider";
import { useState } from "react";
import { Link, redirect } from "react-router";

import { type Currency } from "~/lib/currency";
import { CURRENCY_COOKIE_NAME, readCurrency } from "~/lib/currency-cookie.server";
import { calculatePosition, ISSUE_PRICE_USD, SEC_FILING_URL, TICKER } from "~/lib/deal";
import {
  formatAsOf,
  formatMoney,
  formatPctSigned,
  formatRate,
  formatShares,
  formatUsdAs,
} from "~/lib/format";
import { getQuote, getUsdCadRate } from "~/lib/quote.server";
import { readShares, SHARES_COOKIE_NAME } from "~/lib/shares-cookie.server";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "GRND Share Value" },
    {
      name: "description",
      content: "What your GRND shares from the PurposeMed acquisition are worth today.",
    },
  ];
}

export function headers() {
  return {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Netlify-CDN-Cache-Control": "public, durable, s-maxage=60, stale-while-revalidate=300",
    // The page is rendered with the visitor's share count and currency, so key the CDN cache on those cookies.
    "Netlify-Vary": `cookie=${SHARES_COOKIE_NAME}|${CURRENCY_COOKIE_NAME}`,
  };
}

type Stat = { label: string; value: string; title?: string; hint: string; tone: number };

export async function loader({ request }: Route.LoaderArgs) {
  const [shares, savedCurrency] = await Promise.all([readShares(request), readCurrency(request)]);
  if (shares == null) throw redirect("/settings");

  const [quote, usdCad] = await Promise.all([
    getQuote(),
    savedCurrency === "CAD" ? getUsdCadRate() : null,
  ]);
  // Without an exchange rate there's nothing to convert with, so fall back to USD.
  const currency: Currency = usdCad != null ? savedCurrency : "USD";
  const rate = usdCad ?? 1;
  const money = (usd: number, signed = false) => formatUsdAs(usd, currency, rate, signed);
  // In CAD, hovering a total shows the USD amount it was converted from.
  const usdTitle = (usd: number, signed = false) =>
    currency === "CAD" ? formatMoney(usd, "USD", signed) : undefined;

  const position = quote ? calculatePosition(shares, quote.price) : null;
  const originalValue = shares * ISSUE_PRICE_USD;
  const stats: Stat[] = [
    {
      label: "Original value",
      value: money(originalValue),
      title: usdTitle(originalValue),
      hint: `at ${formatMoney(ISSUE_PRICE_USD, "USD")}/share`,
      tone: 0,
    },
    {
      label: "Current value",
      value: position ? money(position.currentValue) : "—",
      title: position ? usdTitle(position.currentValue) : undefined,
      hint: quote ? `at ${formatMoney(quote.price, "USD")}/share` : "price unavailable",
      tone: 0,
    },
    {
      label: position && position.gain < 0 ? "Capital loss" : "Capital gain",
      value: position ? money(position.gain, true) : "—",
      title: position ? usdTitle(position.gain, true) : undefined,
      hint: position ? formatPctSigned(position.gainPct) : " ",
      tone: position ? Math.sign(position.gain) : 0,
    },
  ];

  const dayChange =
    quote?.previousClose != null ? (quote.price - quote.previousClose) / quote.previousClose : null;

  return {
    shares,
    currency,
    usdCad: rate,
    cadUnavailable: savedCurrency === "CAD" && usdCad == null,
    livePrice: quote?.price ?? null,
    quote: quote && {
      price: formatMoney(quote.price, "USD"),
      dayChange: dayChange != null ? formatPctSigned(dayChange) : null,
      dayTone: dayChange != null ? Math.sign(dayChange) : 0,
      asOf: formatAsOf(quote.asOf),
    },
    stats,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { shares, currency, usdCad, cadUnavailable, livePrice, quote, stats } = loaderData;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
            PurposeMed × Grindr
          </p>
          <Link
            to="/settings"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            Settings
          </Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {formatShares(shares)} {TICKER} shares
        </h1>
        {quote ? (
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-neutral-600 dark:text-neutral-400">
            <span className="font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">
              {TICKER} {quote.price}
            </span>
            {quote.dayChange && (
              <span className={`text-sm tabular-nums ${toneClass(quote.dayTone)}`}>
                {quote.dayChange} today
              </span>
            )}
            <span className="text-xs text-neutral-500">as of {quote.asOf} · Yahoo Finance</span>
          </p>
        ) : (
          <p className="text-sm text-red-700 dark:text-red-400">
            Couldn&apos;t load the current {TICKER} price. Reload in a minute.
          </p>
        )}
      </header>

      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <dt className="text-sm text-neutral-600 dark:text-neutral-400">{stat.label}</dt>
            <dd
              title={stat.title}
              className={`text-2xl font-semibold tabular-nums ${toneClass(stat.tone)}`}
            >
              {stat.value}
            </dd>
            <dd
              className={`text-xs tabular-nums ${stat.tone ? toneClass(stat.tone) : "text-neutral-500"}`}
            >
              {stat.hint}
            </dd>
          </div>
        ))}
      </dl>

      {livePrice != null && (
        <WhatIf shares={shares} livePrice={livePrice} currency={currency} usdCad={usdCad} />
      )}

      <footer className="text-xs text-neutral-500">
        Prices are delayed; per-share prices are in USD.{" "}
        {currency === "CAD" && `Totals are converted at 1 USD = ${formatRate(usdCad)} CAD. `}
        {cadUnavailable && "The USD/CAD rate is unavailable, so totals are shown in USD. "}
        Original value uses the deal&apos;s issue price from Grindr&apos;s{" "}
        <a href={SEC_FILING_URL} className="underline">
          8-K filing
        </a>
        . For information only — not financial or tax advice.
      </footer>
    </main>
  );
}

/** The one interactive part of the page: a slider to try out other share prices. */
function WhatIf({
  shares,
  livePrice,
  currency,
  usdCad,
}: {
  shares: number;
  livePrice: number;
  currency: Currency;
  usdCad: number;
}) {
  const [price, setPrice] = useState(livePrice);
  const { currentValue, gain, gainPct } = calculatePosition(shares, price);
  const max = Math.max(30, Math.ceil(livePrice * 2));

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <Slider.Root
        value={price}
        onValueChange={(next) => setPrice(next as number)}
        min={0}
        max={max}
        step={0.01}
        format={{ style: "currency", currency: "USD" }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-baseline justify-between gap-4">
          <Slider.Label className="text-sm font-medium">What if {TICKER} were at…</Slider.Label>
          <Slider.Value className="text-lg font-semibold tabular-nums">
            {(_, [value]) => formatMoney(value, "USD")}
          </Slider.Value>
        </div>
        <Slider.Control className="flex w-full touch-none items-center py-2 select-none">
          <Slider.Track className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
            <Slider.Indicator className="rounded-full bg-emerald-600" />
            <Slider.Thumb className="size-5 rounded-full border-2 border-emerald-600 bg-white shadow has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-600" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          Worth{" "}
          <span className="font-semibold tabular-nums">
            {formatUsdAs(currentValue, currency, usdCad)}
          </span>{" "}
          ·{" "}
          <span className={`font-semibold tabular-nums ${toneClass(Math.sign(gain))}`}>
            {formatUsdAs(gain, currency, usdCad, true)} ({formatPctSigned(gainPct)})
          </span>
        </p>
        <button
          type="button"
          onClick={() => setPrice(livePrice)}
          disabled={price === livePrice}
          className="text-emerald-700 hover:underline disabled:invisible dark:text-emerald-400"
        >
          Reset to live price
        </button>
      </div>
    </section>
  );
}

function toneClass(tone: number) {
  if (tone > 0) return "text-emerald-700 dark:text-emerald-400";
  if (tone < 0) return "text-red-700 dark:text-red-400";
  return "";
}
