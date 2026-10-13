import { Accordion } from "@base-ui/react/accordion";
import { NumberField } from "@base-ui/react/number-field";
import { Progress } from "@base-ui/react/progress";
import { Slider } from "@base-ui/react/slider";
import { useEffect, useId, useRef, useState } from "react";
import { data, type ShouldRevalidateFunction, useFetcher, useRevalidator } from "react-router";

import {
  calculatePosition,
  getLockup,
  ISSUE_PRICE_USD,
  LOCKUP_MONTHS,
  SEC_FILING_URL,
  TICKER,
  TOTAL_DEAL_SHARES,
} from "~/lib/deal";
import { formatDate, formatPctSigned, formatUsd, formatUsdSigned } from "~/lib/format";
import { getQuote } from "~/lib/quote.server";
import {
  parseShares,
  readShares,
  SHARES_COOKIE_NAME,
  writeShares,
} from "~/lib/shares-cookie.server";
import type { Route } from "./+types/home";

const REFRESH_MS = 60_000;
const SAVE_DEBOUNCE_MS = 400;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "GRND Lockup Tracker" },
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
    // The page is rendered with the visitor's share count, so key the CDN cache on that cookie.
    "Netlify-Vary": `cookie=${SHARES_COOKIE_NAME}`,
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const [quote, shares] = await Promise.all([getQuote(), readShares(request)]);
  return { quote, shares };
}

export async function action({ request }: Route.ActionArgs) {
  const shares = parseShares((await request.formData()).get("shares"));
  return data(null, { headers: { "Set-Cookie": await writeShares(shares) } });
}

// Saving the share count changes nothing the loader returns, so skip the refetch.
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  defaultShouldRevalidate,
}) => {
  return formMethod === "POST" ? false : defaultShouldRevalidate;
};

const asOfFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
  timeZoneName: "short",
});

/** Share count as local state, persisted to the cookie (debounced) via the route action. */
function useSavedShares(initial: number | null) {
  const [shares, setShares] = useState(initial);
  const fetcher = useFetcher();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const update = (value: number | null) => {
    setShares(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetcher.submit({ shares: value ?? "" }, { method: "post" });
    }, SAVE_DEBOUNCE_MS);
  };

  return [shares, update] as const;
}

function useAutoRefresh() {
  const revalidator = useRevalidator();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && revalidator.state === "idle") {
        revalidator.revalidate();
      }
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [revalidator]);
  return revalidator;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { quote } = loaderData;
  const [shares, setShares] = useSavedShares(loaderData.shares);
  const revalidator = useAutoRefresh();
  const [whatIfPrice, setWhatIfPrice] = useState<number | null>(null);

  const livePrice = quote?.price ?? null;
  const position = shares && livePrice ? calculatePosition(shares, livePrice) : null;
  const originalValue = shares ? shares * ISSUE_PRICE_USD : null;
  const dayChange =
    quote?.previousClose != null ? (quote.price - quote.previousClose) / quote.previousClose : null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
          PurposeMed × Grindr
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          What are my {TICKER} shares worth?
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Enter the number of Grindr shares you received in the acquisition. Your shares were
          issued at {formatUsd(ISSUE_PRICE_USD)} each and are locked up for {LOCKUP_MONTHS}{" "}
          months after closing.
        </p>
      </header>

      <QuoteBar
        quote={quote}
        dayChange={dayChange}
        refreshing={revalidator.state === "loading"}
        onRefresh={() => revalidator.revalidate()}
      />

      <section className="flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <SharesField value={shares} onChange={setShares} />

        <dl className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Original value"
            value={originalValue != null ? formatUsd(originalValue) : "—"}
            hint={`at ${formatUsd(ISSUE_PRICE_USD)}/share`}
          />
          <Stat
            label="Current value"
            value={position ? formatUsd(position.currentValue) : "—"}
            hint={livePrice ? `at ${formatUsd(livePrice)}/share` : "price unavailable"}
          />
          <Stat
            label={position && position.gain < 0 ? "Capital loss" : "Capital gain"}
            value={position ? formatUsdSigned(position.gain) : "—"}
            hint={position ? formatPctSigned(position.gainPct) : " "}
            tone={position ? Math.sign(position.gain) : 0}
          />
        </dl>
      </section>

      {shares && livePrice ? (
        <WhatIf
          shares={shares}
          livePrice={livePrice}
          price={whatIfPrice ?? livePrice}
          onChange={setWhatIfPrice}
        />
      ) : null}

      <LockupStatus />

      <Faq />

      <footer className="text-xs text-neutral-500">
        Prices are delayed and in USD. For information only — not financial or tax advice. Your
        share count is saved in a cookie in this browser.
      </footer>
    </main>
  );
}

function QuoteBar({
  quote,
  dayChange,
  refreshing,
  onRefresh,
}: {
  quote: Route.ComponentProps["loaderData"]["quote"];
  dayChange: number | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-900">
      {quote ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-semibold">{TICKER}</span>
          <span className="text-xl font-semibold tabular-nums">{formatUsd(quote.price)}</span>
          {dayChange != null && (
            <span className={`text-sm tabular-nums ${toneClass(Math.sign(dayChange))}`}>
              {formatPctSigned(dayChange)} today
            </span>
          )}
          <span className="text-xs text-neutral-500">
            as of {asOfFormat.format(quote.asOf)} · Yahoo Finance
          </span>
        </div>
      ) : (
        <p className="text-sm text-red-700 dark:text-red-400">
          Couldn&apos;t load the current {TICKER} price. Try again in a minute.
        </p>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
      >
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}

const stepperClass =
  "flex size-11 items-center justify-center border border-neutral-300 bg-neutral-50 text-neutral-700 select-none hover:not-data-disabled:bg-neutral-100 active:not-data-disabled:bg-neutral-200 data-disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:not-data-disabled:bg-neutral-700";

function SharesField({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const id = useId();
  return (
    <NumberField.Root
      id={id}
      value={value}
      onValueChange={(next) => onChange(next != null ? Math.floor(next) : null)}
      min={0}
      max={TOTAL_DEAL_SHARES}
      step={1}
      largeStep={100}
      format={{ maximumFractionDigits: 0 }}
      className="flex flex-col gap-2"
    >
      <label htmlFor={id} className="text-sm font-medium">
        Number of {TICKER} shares
      </label>
      <NumberField.Group className="flex">
        <NumberField.Decrement className={`${stepperClass} rounded-l-lg border-r-0`}>
          <MinusIcon />
        </NumberField.Decrement>
        <NumberField.Input
          placeholder="e.g. 5,000"
          className="h-11 w-full min-w-0 border border-neutral-300 bg-white px-3 text-lg tabular-nums focus:z-1 focus:outline-2 focus:-outline-offset-1 focus:outline-emerald-600 dark:border-neutral-700 dark:bg-neutral-950"
        />
        <NumberField.Increment className={`${stepperClass} rounded-r-lg border-l-0`}>
          <PlusIcon />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = 0,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
      <dt className="text-sm text-neutral-600 dark:text-neutral-400">{label}</dt>
      <dd className={`text-2xl font-semibold tabular-nums ${toneClass(tone)}`}>{value}</dd>
      <dd className={`text-xs tabular-nums ${tone ? toneClass(tone) : "text-neutral-500"}`}>
        {hint}
      </dd>
    </div>
  );
}

function WhatIf({
  shares,
  livePrice,
  price,
  onChange,
}: {
  shares: number;
  livePrice: number;
  price: number;
  onChange: (price: number | null) => void;
}) {
  const { currentValue, gain, gainPct } = calculatePosition(shares, price);
  const max = Math.max(30, Math.ceil(livePrice * 2));

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <Slider.Root
        value={price}
        onValueChange={(next) => onChange(next as number)}
        min={0}
        max={max}
        step={0.01}
        format={{ style: "currency", currency: "USD" }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-baseline justify-between gap-4">
          <Slider.Label className="text-sm font-medium">What if {TICKER} were at…</Slider.Label>
          <Slider.Value className="text-lg font-semibold tabular-nums" />
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
          Worth <span className="font-semibold tabular-nums">{formatUsd(currentValue)}</span> ·{" "}
          <span className={`font-semibold tabular-nums ${toneClass(Math.sign(gain))}`}>
            {formatUsdSigned(gain)} ({formatPctSigned(gainPct)})
          </span>
        </p>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={price === livePrice}
          className="text-emerald-700 hover:underline disabled:invisible dark:text-emerald-400"
        >
          Reset to live price
        </button>
      </div>
    </section>
  );
}

function LockupStatus() {
  const lockup = getLockup(new Date());

  if (!lockup) {
    return (
      <section className="rounded-2xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
        <h2 className="mb-1 font-medium text-neutral-900 dark:text-neutral-100">Lockup</h2>
        Your shares are locked up for {LOCKUP_MONTHS} months after the deal closes (expected Q4
        2026). A countdown will appear here once the closing date is announced.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <Progress.Root value={Math.round(lockup.fractionElapsed * 100)} className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <Progress.Label className="font-medium">Lockup</Progress.Label>
          <span className="text-sm text-neutral-600 tabular-nums dark:text-neutral-400">
            {lockup.daysRemaining > 0
              ? `${lockup.daysRemaining} days left · ends ${formatDate(lockup.end)}`
              : `Ended ${formatDate(lockup.end)}`}
          </span>
        </div>
        <Progress.Track className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <Progress.Indicator className="bg-emerald-600 transition-all" />
        </Progress.Track>
        <p className="text-xs text-neutral-500">Closed {formatDate(lockup.closing)}</p>
      </Progress.Root>
    </section>
  );
}

const faqs = [
  {
    q: `Where does ${formatUsd(ISSUE_PRICE_USD)} come from?`,
    a: (
      <>
        The stock portion of the deal was priced at the volume-weighted average price of {TICKER}{" "}
        over the 15 trading days ending September 29, 2026. See Grindr&apos;s{" "}
        <a href={SEC_FILING_URL} className="text-emerald-700 underline dark:text-emerald-400">
          8-K filing
        </a>
        .
      </>
    ),
  },
  {
    q: "Is this my taxable capital gain?",
    a: "Not necessarily. Everything here is in USD. For Canadian tax purposes your cost base and proceeds are generally measured in CAD using the exchange rates on the acquisition and sale dates, and how the shares were received matters. Talk to your accountant.",
  },
  {
    q: "Where is my share count stored?",
    a: "In a cookie in your browser, so the page can show your numbers as soon as it loads. It's sent to this site with each page request but isn't logged or saved anywhere else.",
  },
];

function Faq() {
  return (
    <Accordion.Root className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {faqs.map(({ q, a }) => (
        <Accordion.Item key={q}>
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-600 dark:hover:bg-neutral-900">
              {q}
              <PlusIcon className="shrink-0 transition-transform duration-150 group-data-panel-open:rotate-45" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="h-(--accordion-panel-height) overflow-hidden text-sm text-neutral-600 transition-[height] duration-150 ease-out data-ending-style:h-0 data-starting-style:h-0 dark:text-neutral-400">
            <div className="px-5 pb-4">{a}</div>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

function toneClass(tone: number) {
  if (tone > 0) return "text-emerald-700 dark:text-emerald-400";
  if (tone < 0) return "text-red-700 dark:text-red-400";
  return "";
}

function PlusIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" {...props}>
      <path d="M2 8h12M8 2v12" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MinusIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" {...props}>
      <path d="M2 8h12" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
