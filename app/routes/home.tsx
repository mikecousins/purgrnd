import { Slider } from "@base-ui/react/slider";
import { useState } from "react";
import { Link, redirect } from "react-router";

import { PaperScenery } from "~/components/paper-scenery";
import { type Currency } from "~/lib/currency";
import { CURRENCY_COOKIE_NAME, readCurrency } from "~/lib/currency-cookie.server";
import {
  calculatePosition,
  CLOSING_DATE,
  CLOSING_USD_CAD,
  ISSUE_PRICE_USD,
  lockupEndDate,
  SEC_FILING_URL,
  TICKER,
} from "~/lib/deal";
import {
  formatAsOf,
  formatDate,
  formatMoney,
  formatMoneyWhole,
  formatPctSigned,
  formatShares,
} from "~/lib/format";
import { getQuote, getUsdCadRate } from "~/lib/quote.server";
import { shareMeta, SITE_TITLE } from "~/lib/share-meta";
import { readShares, SHARES_COOKIE_NAME } from "~/lib/shares-cookie.server";
import { useTheme } from "~/lib/theme";
import { THEME_COOKIE_NAME } from "~/lib/theme-cookie.server";
import type { Route } from "./+types/home";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: SITE_TITLE }, ...shareMeta(loaderData.origin)];
}

export function headers() {
  return {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Netlify-CDN-Cache-Control": "public, durable, s-maxage=60, stale-while-revalidate=300",
    // The page is rendered with the visitor's share count, currency and theme, so key the CDN cache on those cookies.
    "Netlify-Vary": `cookie=${SHARES_COOKIE_NAME}|${CURRENCY_COOKIE_NAME}|${THEME_COOKIE_NAME}`,
  };
}

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
  // In CAD the cost base is fixed at closing day's rate; until then, today's rate stands in for it.
  const costRate = currency === "CAD" ? (CLOSING_USD_CAD ?? rate) : 1;
  // In CAD, hovering a total shows the USD amount behind it.
  const usdTitle = (usd: number, signed = false) =>
    currency === "CAD" ? formatMoney(usd, "USD", signed) : undefined;

  const position = quote ? calculatePosition(shares, quote.price, rate, costRate) : null;
  const usdPosition = quote ? calculatePosition(shares, quote.price) : null;
  const costBase = shares * ISSUE_PRICE_USD;

  const dayChange =
    quote?.previousClose != null ? (quote.price - quote.previousClose) / quote.previousClose : null;
  const lockupEnd = lockupEndDate();

  return {
    origin: new URL(request.url).origin,
    shares,
    currency,
    usdCad: rate,
    costRate,
    closed: CLOSING_DATE != null && CLOSING_USD_CAD != null,
    lockupEnd: lockupEnd && formatDate(lockupEnd),
    cadUnavailable: savedCurrency === "CAD" && usdCad == null,
    livePrice: quote?.price ?? null,
    quote: quote && {
      price: formatMoney(quote.price, "USD"),
      dayChange: dayChange != null ? formatPctSigned(dayChange) : null,
      dayTone: dayChange != null ? Math.sign(dayChange) : 0,
      asOf: formatAsOf(quote.asOf),
    },
    value: {
      text: position ? formatMoneyWhole(position.proceeds, currency) : "—",
      title: usdPosition ? usdTitle(usdPosition.proceeds) : undefined,
    },
    cost: {
      text: formatMoneyWhole(costBase * costRate, currency),
      title: usdTitle(costBase),
    },
    gain: position && {
      label: position.gain < 0 ? "Loss" : "Gain",
      text: formatMoneyWhole(position.gain, currency, true),
      title: usdPosition ? usdTitle(usdPosition.gain, true) : undefined,
      pct: formatPctSigned(position.gainPct),
      tone: Math.sign(position.gain),
    },
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const {
    shares,
    currency,
    usdCad,
    costRate,
    closed,
    lockupEnd,
    cadUnavailable,
    livePrice,
    quote,
    value,
    cost,
    gain,
  } = loaderData;
  const theme = useTheme();

  const notes = [
    "Delayed",
    <>
      Cost{" "}
      <a href={SEC_FILING_URL} className="underline underline-offset-4 hover:text-ink">
        {formatMoney(ISSUE_PRICE_USD, "USD")}/sh
      </a>
    </>,
    lockupEnd && `Lock-up ends ${lockupEnd}`,
    cadUnavailable && "No USD/CAD rate, showing USD",
    "Not advice",
  ].filter(Boolean);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {theme === "paper" ? (
        <PaperScenery />
      ) : (
        <>
          <div aria-hidden="true" className="synth-floor" />
          <div aria-hidden="true" className="synth-horizon" />
          <div aria-hidden="true" className="scanlines" />
        </>
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-360 flex-1 flex-col gap-6 p-[clamp(16px,3vw,40px)]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <p className="mr-auto flex items-center gap-3 text-sm tracking-[0.32em]">
            <Logo />
            PURGRND
          </p>
          {/* On a phone the ticker drops to its own row, under the logo and settings. */}
          <div className="max-sm:order-last max-sm:basis-full">
            {quote ? (
              <p
                title={`As of ${quote.asOf} · Yahoo Finance`}
                className="chamfer flex h-11 items-center gap-3 bg-panel px-4 text-sm tracking-wider"
              >
                <span
                  aria-hidden="true"
                  className={`pulse size-2 bg-current shadow-[0_0_10px_currentColor] ${toneClass(quote.dayTone)}`}
                />
                <span className="text-dim">{TICKER}</span>
                <span className="font-display text-[17px] font-semibold tabular-nums">
                  {quote.price}
                </span>
                {quote.dayChange && (
                  <span className={`tabular-nums ${toneClass(quote.dayTone)}`}>
                    {quote.dayChange}
                  </span>
                )}
              </p>
            ) : (
              <p className="chamfer flex h-11 items-center bg-panel px-4 text-sm tracking-wider text-down uppercase">
                {TICKER} price offline
              </p>
            )}
          </div>
          <Link
            to="/settings"
            aria-label="Settings"
            className="chamfer flex size-11 items-center justify-center bg-panel text-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-up"
          >
            <SettingsIcon />
          </Link>
        </header>

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 text-center">
          <h1 className="text-[13px] tracking-[0.4em] text-dim uppercase">
            [ Worth today · {currency} ]
          </h1>
          <p
            title={value.title}
            className="neon font-display leading-[0.88] font-bold tracking-tight whitespace-nowrap text-glow tabular-nums"
            style={{ fontSize: heroSize(value.text) }}
          >
            {value.text}
          </p>
          <dl className="mt-[clamp(16px,4vh,48px)] grid w-full max-w-220 grid-cols-3 gap-4 border-t border-line pt-5">
            <Stat
              label={gain?.label ?? "Gain"}
              value={gain?.text ?? "—"}
              title={gain?.title}
              hint={gain?.pct}
              tone={gain?.tone ?? 0}
            />
            <Stat label="Cost" value={cost.text} title={cost.title} />
            <Stat label="Shares" value={formatShares(shares)} />
          </dl>
        </main>

        {livePrice != null && (
          <WhatIf
            shares={shares}
            livePrice={livePrice}
            currency={currency}
            usdCad={usdCad}
            costRate={costRate}
            // Until the deal closes the cost base uses today's rate, so the exchange rate can't add anything yet.
            showBreakdown={currency === "CAD" && closed}
          />
        )}

        <footer className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-center text-[11px] tracking-[0.2em] text-dim uppercase">
          {notes.map((note, i) => (
            <span key={i} className="flex gap-3">
              {i > 0 && <span aria-hidden="true">·</span>}
              {note}
            </span>
          ))}
        </footer>
      </div>
    </div>
  );
}

/** Sizes the hero number to fit the screen's width (and not crowd out the rest on a short one). */
function heroSize(text: string) {
  return `min(15rem, ${(92 / (text.length * 0.6)).toFixed(2)}vw, 30vh)`;
}

function Stat({
  label,
  value,
  title,
  hint,
  tone = 0,
}: {
  label: string;
  value: string;
  title?: string;
  hint?: string;
  tone?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-xs tracking-[0.32em] text-dim uppercase">{label}</dt>
      <dd
        title={title}
        className={`font-display text-[clamp(20px,3.4vw,44px)] font-semibold tabular-nums ${toneClass(tone)}`}
      >
        {value}
      </dd>
      {hint && <dd className={`text-[13px] tabular-nums ${toneClass(tone)}`}>{hint}</dd>}
    </div>
  );
}

/** The one interactive part of the page: a slider to try out other share prices. */
function WhatIf({
  shares,
  livePrice,
  currency,
  usdCad,
  costRate,
  showBreakdown,
}: {
  shares: number;
  livePrice: number;
  currency: Currency;
  usdCad: number;
  costRate: number;
  showBreakdown: boolean;
}) {
  const [price, setPrice] = useState(livePrice);
  // Selling at the slider's price, converted at today's rate.
  const { proceeds, gain, fromPrice, fromFx } = calculatePosition(shares, price, usdCad, costRate);
  const max = Math.max(30, Math.ceil(livePrice * 2));
  // In CAD after closing, hovering the gain shows how much came from GRND's price and how much from the exchange rate.
  const breakdown = showBreakdown
    ? `${formatMoney(fromPrice, "CAD", true)} from ${TICKER}'s price, ${formatMoney(fromFx, "CAD", true)} from the exchange rate`
    : undefined;
  const big = "font-display text-[clamp(24px,2.6vw,34px)] font-semibold tabular-nums";

  return (
    <section className="chamfer mx-auto w-full max-w-220 bg-panel/(--glass) px-[clamp(16px,2.4vw,28px)] pt-4 pb-2 backdrop-blur-sm">
      <Slider.Root
        value={price}
        onValueChange={(next) => setPrice(next as number)}
        min={0}
        max={max}
        step={0.01}
        format={{ style: "currency", currency: "USD" }}
        className="flex flex-col gap-1"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <div className="flex items-center gap-3">
            <Slider.Label className="text-[13px] tracking-[0.3em] text-dim">
              IF {TICKER} =
            </Slider.Label>
            <Slider.Value className={`${big} text-neon`}>
              {(_, [value]) => formatMoney(value, "USD")}
            </Slider.Value>
            <button
              type="button"
              onClick={() => setPrice(livePrice)}
              disabled={price === livePrice}
              className="min-h-8 rounded-control border border-tick px-2.5 text-[11px] tracking-[0.2em] text-dim uppercase hover:border-dim hover:text-ink disabled:invisible"
            >
              Reset
            </button>
          </div>
          <p className="flex items-baseline gap-3 tabular-nums">
            <span className={`${big} text-glow`}>{formatMoneyWhole(proceeds, currency)}</span>
            <span title={breakdown} className={`text-sm ${toneClass(Math.sign(gain))}`}>
              {formatMoneyWhole(gain, currency, true)}
            </span>
          </p>
        </div>
        <Slider.Control className="flex w-full touch-none items-center py-4 select-none">
          <Slider.Track className="ticks h-2 w-full border-b border-tick">
            <Slider.Indicator className="bg-neon/25" />
            <Slider.Thumb className="h-8.5 w-4.5 rounded-control border-2 border-neon bg-void glow-strong has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-up" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </section>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="text-neon">
      <path d="M11 2 L20 11 L11 20 L2 11 Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M11 7 L15 11 L11 15 L7 11 Z" fill="currentColor" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <rect x="14" y="4.5" width="4" height="5" />
      <rect x="6" y="14.5" width="4" height="5" />
    </svg>
  );
}

function toneClass(tone: number) {
  if (tone > 0) return "text-up";
  if (tone < 0) return "text-down";
  return "";
}
