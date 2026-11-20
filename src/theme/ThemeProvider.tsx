import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { color, shadow } from "./tokens.generated";

export type ColorScheme = "light" | "dark";
/** "system" follows the phone's setting (the default); the user can force light or dark. */
export type ThemePreference = "system" | ColorScheme;

export type ThemeColors = { readonly [K in keyof typeof color.light]: string };
export type ThemeShadows = { readonly [K in keyof typeof shadow.light]: string };

export interface Theme {
  scheme: ColorScheme;
  color: ThemeColors;
  shadow: ThemeShadows;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<Theme | null>(null);

/**
 * Supplies the light or dark token set. Same token names in both themes, so components
 * never branch on the scheme themselves; they read `theme.color.*`.
 *
 * The preference lives in memory for now. Persisting it needs on-device storage, which
 * arrives with the auth work.
 */
export function ThemeProvider({ children, initialPreference = "system" }: { children: ReactNode; initialPreference?: ThemePreference }) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const scheme: ColorScheme = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;

  const value = useMemo<Theme>(
    () => ({ scheme, color: color[scheme], shadow: shadow[scheme], preference, setPreference }),
    [scheme, preference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside <ThemeProvider>");
  return theme;
}
