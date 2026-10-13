import { useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";

import { PaperScenery } from "~/components/paper-scenery";
import { CURRENCIES, parseCurrency } from "~/lib/currency";
import { readCurrency, writeCurrency } from "~/lib/currency-cookie.server";
import { TICKER, TOTAL_DEAL_SHARES } from "~/lib/deal";
import { formatShares } from "~/lib/format";
import { shareMeta, SITE_TITLE } from "~/lib/share-meta";
import { parseShares, readShares, writeShares } from "~/lib/shares-cookie.server";
import {
  parseTheme,
  type Theme,
  THEME_LABELS,
  THEMES,
  useSavedTheme,
  useThemePreview,
} from "~/lib/theme";
import { writeTheme } from "~/lib/theme-cookie.server";
import type { Route } from "./+types/settings";

export function meta({ loaderData }: Route.MetaArgs) {
  // First-time visitors, and link-preview crawlers, land here before there's anything to set.
  const title = loaderData.shares == null ? SITE_TITLE : `Settings · ${SITE_TITLE}`;
  return [{ title }, ...shareMeta(loaderData.origin)];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [shares, currency] = await Promise.all([readShares(request), readCurrency(request)]);
  return { origin: new URL(request.url).origin, shares, currency };
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
  headers.append("Set-Cookie", await writeTheme(parseTheme(form.get("theme"))));
  return redirect("/", { headers });
}

export default function Settings({ loaderData, actionData }: Route.ComponentProps) {
  const { shares, currency } = loaderData;
  const saving = useNavigation().state === "submitting";
  const error = actionData?.error;
  // Picking a theme shows it straight away; leaving without saving puts the saved one back.
  const [theme, setTheme] = useState<Theme>(useSavedTheme());
  useThemePreview(theme);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* No mountains here: they'd run behind the note under the form. */}
      {theme === "paper" && <PaperScenery landscape={false} />}
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-sm tracking-[0.32em] text-neon uppercase">PurposeMed × Grindr</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            {shares == null ? "Set up your shares" : "Settings"}
          </h1>
        </header>

        <Form method="post" className="chamfer flex flex-col gap-6 bg-panel p-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="shares" className="text-sm text-dim">
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
              className="h-12 w-full rounded-control border border-tick bg-void px-3 font-display text-xl font-semibold tabular-nums placeholder:font-mono placeholder:text-base placeholder:font-normal placeholder:text-dim focus:border-neon focus:outline-none aria-invalid:border-down"
            />
            {error && (
              <p id="shares-error" className="text-sm text-down">
                {error}
              </p>
            )}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-dim">Show totals in</legend>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map((c) => (
                <label key={c} className={optionClass}>
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

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-dim">Theme</legend>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <label key={t} className={optionClass}>
                  <input
                    type="radio"
                    name="theme"
                    value={t}
                    checked={t === theme}
                    onChange={() => setTheme(t)}
                    className="sr-only"
                  />
                  {THEME_LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-4">
            {shares != null && (
              <Link to="/" className="text-sm tracking-[0.2em] text-dim uppercase hover:text-ink">
                Cancel
              </Link>
            )}
            <button
              type="submit"
              disabled={saving}
              className="chamfer min-h-11 bg-neon px-6 text-sm tracking-[0.2em] text-void uppercase hover:bg-neon-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Form>

        <p className="text-xs leading-relaxed text-dim">
          Your share count, currency and theme are saved in cookies in this browser so the page can
          show your numbers as soon as it loads. They aren&apos;t logged or stored anywhere else.
        </p>
      </main>
    </div>
  );
}

const optionClass =
  "flex min-h-11 cursor-pointer items-center justify-center rounded-control border border-tick px-3 tracking-[0.2em] text-dim select-none hover:text-ink has-checked:border-neon has-checked:text-neon has-checked:glow has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-up";
