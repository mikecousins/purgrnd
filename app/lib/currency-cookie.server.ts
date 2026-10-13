import { createCookie } from "react-router";

import { type Currency, parseCurrency } from "./currency";

export const CURRENCY_COOKIE_NAME = "grnd_currency";

const currencyCookie = createCookie(CURRENCY_COOKIE_NAME, {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 400, // browsers cap cookies at 400 days; refreshed on every save
});

export async function readCurrency(request: Request): Promise<Currency> {
  return parseCurrency(await currencyCookie.parse(request.headers.get("Cookie")));
}

export function writeCurrency(currency: Currency): Promise<string> {
  return currencyCookie.serialize(currency);
}
