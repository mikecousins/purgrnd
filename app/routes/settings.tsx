import { data, Form, Link, redirect, useNavigation } from "react-router";

import { CURRENCIES, parseCurrency } from "~/lib/currency";
import { readCurrency, writeCurrency } from "~/lib/currency-cookie.server";
import { TICKER, TOTAL_DEAL_SHARES } from "~/lib/deal";
import { formatShares } from "~/lib/format";
import { parseShares, readShares, writeShares } from "~/lib/shares-cookie.server";
import type { Route } from "./+types/settings";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Settings · GRND Share Value" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [shares, currency] = await Promise.all([readShares(request), readCurrency(request)]);
  return { shares, currency };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const shares = parseShares(form.get("shares"));
  if (shares == null) {
    return data(
      { error: `Enter a whole number of shares from 1 to ${formatShares(TOTAL_DEAL_SHARES)}.` },
      { status: 400 },
    );
  }
  const headers = new Headers();
  headers.append("Set-Cookie", await writeShares(shares));
  headers.append("Set-Cookie", await writeCurrency(parseCurrency(form.get("currency"))));
  return redirect("/", { headers });
}

export default function Settings({ loaderData, actionData }: Route.ComponentProps) {
  const { shares, currency } = loaderData;
  const saving = useNavigation().state === "submitting";
  const error = actionData?.error;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
          PurposeMed × Grindr
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {shares == null ? "Set up your shares" : "Settings"}
        </h1>
      </header>

      <Form
        method="post"
        className="flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="shares" className="text-sm font-medium">
            How many {TICKER} shares did you receive?
          </label>
          <input
            id="shares"
            name="shares"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            defaultValue={shares != null ? formatShares(shares) : ""}
            placeholder="e.g. 5,000"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "shares-error" : undefined}
            className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-lg tabular-nums focus:outline-2 focus:-outline-offset-1 focus:outline-emerald-600 aria-invalid:border-red-600 dark:border-neutral-700 dark:bg-neutral-950"
          />
          {error && (
            <p id="shares-error" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Show totals in</legend>
          <div className="grid grid-cols-2 gap-2">
            {CURRENCIES.map((c) => (
              <label
                key={c}
                className="flex cursor-pointer items-center justify-center rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium select-none has-checked:border-emerald-600 has-checked:bg-emerald-600 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-emerald-600 dark:border-neutral-700"
              >
                <input
                  type="radio"
                  name="currency"
                  value={c}
                  defaultChecked={c === currency}
                  className="sr-only"
                />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-4">
          {shares != null && (
            <Link to="/" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
              Cancel
            </Link>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </Form>

      <p className="text-xs text-neutral-500">
        Your share count and currency are saved in cookies in this browser so the page can show
        your numbers as soon as it loads. They aren&apos;t logged or stored anywhere else.
      </p>
    </main>
  );
}
