import { render, type RenderOptions } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { ThemeProvider, type ThemePreference } from "@/theme";

/** render() inside the app's ThemeProvider, optionally forcing light or dark. */
export function renderWithTheme(ui: ReactElement, opts: RenderOptions & { preference?: ThemePreference } = {}) {
  const { preference = "light", ...rest } = opts;
  return render(<ThemeProvider initialPreference={preference}>{ui}</ThemeProvider>, rest);
}
