import { useState } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { type Theme, THEME_COLORS, ThemeContext, useSavedTheme } from "~/lib/theme";
import { readTheme } from "~/lib/theme-cookie.server";
import type { Route } from "./+types/root";
import "./app.css";

export async function loader({ request }: Route.LoaderArgs) {
  return { theme: await readTheme(request) };
}

export const links: Route.LinksFunction = () => [
  // Browsers that can't use the SVG fall back to the .ico.
  { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Lilita+One&family=Nunito:wght@600;700;800;900&family=Share+Tech+Mono&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const saved = useSavedTheme();
  // The settings page previews a theme before it's saved.
  const [preview, setPreview] = useState<Theme | null>(null);
  const theme = preview ?? saved;

  return (
    <html lang="en" data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={THEME_COLORS[theme]} />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeContext value={{ theme, setPreview }}>
          <div className="root">{children}</div>
        </ThemeContext>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-2xl font-semibold">{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
