# purgrnd

A small web app for PurposeMed employees to see what the Grindr (`GRND`) shares they received in the
acquisition are worth. It shows:

- **Original value**: shares × $15.58 (the deal's 15-day VWAP issue price, per Grindr's
  [8-K](https://www.sec.gov/Archives/edgar/data/0001820144/000182014426000033/grnd-20260930.htm))
- **Current value**: shares × the live GRND price (Yahoo Finance, fetched server-side, refreshed every minute)
- **Capital gain/loss**: in dollars and percent
- A "what if" price slider

First-time visitors are sent to `/settings` to enter their share count and pick a currency (CAD or
USD). Both are saved in HTTP-only cookies, so the dashboard is rendered entirely on the server with
your numbers filled in; the "what if" slider is its only client-side state.

Per-share prices are always in USD. In CAD, totals and gain/loss are converted at the live USD/CAD
rate (Yahoo Finance); hover one to see the original USD value.

Built with React Router (SSR), Tailwind CSS v4 and [Base UI](https://base-ui.com).

## Development

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm typecheck
pnpm build
```

## Updating deal details

Deal constants live in `app/lib/deal.ts`.

## Deploying to Netlify

`netlify.toml` and `@netlify/vite-plugin-react-router` are already configured: the build runs
`pnpm build`, static assets are published from `build/client`, and SSR runs as a Netlify Function.
To turn on automatic deploys from GitHub:

1. In Netlify, choose **Add new project → Import an existing project → GitHub** and pick
   `mikecousins/purgrnd`.
2. Leave the build settings as detected (they come from `netlify.toml`) and deploy.

Every push to `main` then deploys to production, and pull requests get deploy previews. No
environment variables are needed.
