# purgrnd

A small web app for PurposeMed employees to see what the Grindr (`GRND`) shares they received in the
acquisition are worth. It's one full-screen, retro-futuristic dashboard showing:

- **Current value**, front and centre: shares × the live GRND price (Yahoo Finance, fetched
  server-side, refreshed every minute)
- **Cost base**: shares × $15.58 (the deal's 15-day VWAP issue price, per Grindr's
  [8-K](https://www.sec.gov/Archives/edgar/data/0001820144/000182014426000033/grnd-20260930.htm))
- **Capital gain/loss**: in dollars and percent
- A "what if" price slider
- A countdown to the day the shares can be sold: the 12-month lock-up runs from the closing date, and
  the countdown ticks to midnight New York time (GRND trades on the NYSE) that day

First-time visitors are sent to `/settings` to enter their share count and pick a currency (CAD or
USD). Both are saved in HTTP-only cookies, so the dashboard is rendered entirely on the server with
your numbers filled in; the "what if" slider is its only client-side state.

Settings also has a theme picker: the default neon **Synthwave** look, or **Paper**, a layered
paper-cutout tropical beach (sunset sky, layered sea, sand and palms). Picking one previews it
straight away, and saving stores it in a cookie alongside the others, so the right theme is
server-rendered on the next visit with no flash. Each option shows a screenshot of the dashboard in that
theme (`public/themes/*.webp`, 480×300); retake them if the dashboard's look changes.

Per-share prices are always in USD. In CAD, the gain/loss is worked out the way Canadian tax does it:
the cost base is converted at the Bank of Canada USD/CAD rate on the closing date and stays fixed,
while the current value is converted at today's rate (Yahoo Finance). So the CAD gain moves with the
exchange rate as well as with GRND; once the deal closes, hovering the "what if" gain shows how much
of it came from each. Hover a total to see the USD amount behind it.

Built with React Router (SSR), Tailwind CSS v4 and [Base UI](https://base-ui.com).

## Development

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm typecheck
pnpm build
```

## Updating deal details

Deal constants live in `app/lib/deal.ts`. When the deal closes, set `CLOSING_DATE` and
`CLOSING_USD_CAD` (the [Bank of Canada rate](https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates/)
for that day). Until then, the CAD cost base is estimated at today's rate, the lock-up end date
isn't shown, and the countdown just says the shares are sellable 12 months after closing.

## Deploying to Netlify

`netlify.toml` and `@netlify/vite-plugin-react-router` are already configured: the build runs
`pnpm build`, static assets are published from `build/client`, and SSR runs as a Netlify Function.
To turn on automatic deploys from GitHub:

1. In Netlify, choose **Add new project → Import an existing project → GitHub** and pick
   `mikecousins/purgrnd`.
2. Leave the build settings as detected (they come from `netlify.toml`) and deploy.

Every push to `main` then deploys to production, and pull requests get deploy previews. No
environment variables are needed.
