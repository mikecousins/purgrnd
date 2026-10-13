import { createCookie } from "react-router";

import { parseTheme, type Theme } from "./theme";

export const THEME_COOKIE_NAME = "grnd_theme";

const themeCookie = createCookie(THEME_COOKIE_NAME, {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 400, // browsers cap cookies at 400 days; refreshed on every save
});

export async function readTheme(request: Request): Promise<Theme> {
  return parseTheme(await themeCookie.parse(request.headers.get("Cookie")));
}

export function writeTheme(theme: Theme): Promise<string> {
  return themeCookie.serialize(theme);
}
