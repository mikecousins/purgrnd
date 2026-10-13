import { createCookie } from "react-router";

import { TOTAL_DEAL_SHARES } from "./deal";

export const SHARES_COOKIE_NAME = "grnd_shares";

const sharesCookie = createCookie(SHARES_COOKIE_NAME, {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 400, // browsers cap cookies at 400 days; refreshed on every save
});

/** A share count is valid if it's a whole number no larger than the whole stock consideration. */
export function parseShares(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.replaceAll(",", "")) : value;
  return typeof n === "number" && Number.isInteger(n) && n > 0 && n <= TOTAL_DEAL_SHARES
    ? n
    : null;
}

export async function readShares(request: Request): Promise<number | null> {
  return parseShares(await sharesCookie.parse(request.headers.get("Cookie")));
}

export function writeShares(shares: number): Promise<string> {
  return sharesCookie.serialize(shares);
}
