import { createContext, useContext, useEffect } from "react";
import { useRouteLoaderData } from "react-router";

import type { loader as rootLoader } from "~/root";

export const THEMES = ["synth", "paper"] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "synth";

export const THEME_LABELS: Record<Theme, string> = {
  synth: "Synthwave",
  paper: "Paper",
};

/** The browser chrome colour for each theme, to match its page background. */
export const THEME_COLORS: Record<Theme, string> = {
  synth: "#07060f",
  paper: "#ff9a85",
};

export function parseTheme(value: unknown): Theme {
  return THEMES.find((t) => t === value) ?? DEFAULT_THEME;
}

/** The theme saved in the visitor's cookie, read by the root loader. */
export function useSavedTheme(): Theme {
  return useRouteLoaderData<typeof rootLoader>("root")?.theme ?? DEFAULT_THEME;
}

type ThemeState = {
  /** The theme on screen: a preview if one is showing, otherwise the saved theme. */
  theme: Theme;
  setPreview: (theme: Theme | null) => void;
};

export const ThemeContext = createContext<ThemeState>({
  theme: DEFAULT_THEME,
  setPreview: () => {},
});

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

/** Shows `theme` across the site, without saving it, until the calling component unmounts. */
export function useThemePreview(theme: Theme) {
  const { setPreview } = useContext(ThemeContext);
  useEffect(() => {
    setPreview(theme);
    return () => setPreview(null);
  }, [theme, setPreview]);
}
